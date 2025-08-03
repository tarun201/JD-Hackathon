const { getObjectId } = require("./db/connection");
const { getRabbitMQChannel } = require("./rabbitMq/connection");
const { updateOne, findOneAndUpdate } = require("./utils/dbQueries");
const { rabbitMqQueues, tableMap } = require("./utils/lib");


async function startConsumer() {
    try {
        const ch = await getRabbitMQChannel();

        // Start consuming messages
        // prefetch: 1 means the consumer will only get 1 message at a time until it acknowledges it.
        // This prevents overwhelming the consumer and distributes messages fairly among multiple consumers.
        ch.prefetch(1);

        ch.consume(rabbitMqQueues.framePostProcessing, async (msg) => {
            if (msg !== null) {
                const messageContent = msg.content.toString();
                console.log(`\n[${new Date().toLocaleTimeString()}] Received message: ${messageContent}`);

                // --- Start processing the message here ---
                try {
                    const data = JSON.parse(messageContent); // Assuming messages are JSON
                    console.log('  Processing data:', data);

                    const { input_data, moderation_results } = data
                    const { totalCount, videoId, chunkId, url, lastChunk, start, end } = input_data

                    const { nudity_detection, copyright_infringement_detection, fraud_detection, blur_detection } = moderation_results

                    let doc = {}
                    if (
                        !nudity_detection?.explanation?.search('No') ||
                        !fraud_detection?.explanation?.search('No') ||
                        !copyright_infringement_detection?.explanation?.search('No') ||
                        !blur_detection
                    ) {
                        await updateOne(tableMap.frameTable, { _id: chunkId }, { $set: { "raw": moderation_results } })
                        doc = await findOneAndUpdate(tableMap.videoTable, { _id: getObjectId(videoId) }, { $set: { decision: 2 }, $push: { raw: { [`${start}-${end}`]: moderation_results } } })
                    }

                    if (lastChunk && doc?.processed_frame_cnt === totalCount) {
                        await updateOne(tableMap.videoTable, { _id: getObjectId(videoId) }, { $set: { file_status: 4 } })
                    }

                    // const updateObjPush = {}
                    // if (!nudity_detection?.explanation?.search('No nudity')) {
                    //     updateObjPush.nudity.details = {
                    //         frame_time_in_sec: `${start}-${end}`,
                    //         lvl: nudity_detection?.sensitivity_level || '',
                    //         score: nudity_detection?.confidence_score || 0
                    //     }
                    // }

                    // if (!fraud_detection?.explanation?.search('No fraud')) {
                    //     updateObjPush.nudity.details = {
                    //         frame_time_in_sec: `${start}-${end}`,
                    //         lvl: nudity_detection?.sensitivity_level || '',
                    //         score: nudity_detection?.confidence_score || 0
                    //     }
                    // }

                    // If processing is successful
                    console.log('  Processing complete for message:', messageContent);
                    ch.ack(msg); // Acknowledge the message to remove it from the queue
                    console.log('  Message acknowledged.');

                } catch (processingError) {
                    console.error('  Error processing message:', processingError);
                    // If processing fails, you have options:
                    // 1. ch.nack(msg): Reject and requeue (send back to queue) - use with caution to avoid infinite loops if error is persistent
                    // 2. ch.nack(msg, false, false): Reject and discard (dead-letter if configured)
                    // 3. ch.ack(msg): Acknowledge anyway (if you don't want to retry)
                    // For this example, we'll just nack without requeueing to avoid infinite loops
                    ch.nack(msg, false, false);
                    console.log('  Message rejected (not re-queued due to error).');
                }
                // --- End processing ---

            } else {
                console.log('Consumer cancelled by RabbitMQ (e.g., queue deleted).');
            }
        });

    } catch (error) {
        console.error('Failed to start consumer:', error);
        process.exit(1);
    }
}


startConsumer()