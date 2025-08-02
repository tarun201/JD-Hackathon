const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ffmpegPath = require('ffmpeg-static');
const { getVideoDuration, getFrameCount } = require('../utils/videoProcessing.js');
const { getRabbitMQChannel, sendToQueue, runConsumer } = require('../rabbitMq/connection.js');
const { createframeInsertTemplate, rabbitMqQueues, tableMap } = require('../utils/lib.js');
const { insertMany, insertOne, updateOne } = require('../utils/dbQueries.js');
const { uploadToS3, uploadVideoToS3 } = require('../utils/aws.js');
const { processVideo } = require('../utils/videoConvertor.js');
const { getObjectId } = require('../db/connection.js');

ffmpeg.setFfmpegPath(ffmpegPath);



const video = path.join(process.cwd(), 'app/uploads/dirty.mp4');;
const frameLimit = 5;

async function extractFramesWithProcessing(inputPath, outputDir, fps, videoId) {


    return new Promise((resolve, reject) => {
        let frameIdx = 1;
        let pending = 0;
        let done = false;
        let errors = [];

        // Hook: monitor 'end' event to resolve only when all processing is also done
        function checkDone() {
            if (done && pending === 0) {
                if (errors.length > 0) reject(errors[0]);
                else resolve();
            }
        }

        let frameBatch = [];
        let insertManyArr = [];

        const myid = videoId;

        ffmpeg(inputPath)
            .outputOptions([`-vf`, `fps=${fps},showinfo`])
            .output(path.join(outputDir, 'temp_%06d.jpg'))
            .on('stderr', async (line) => {
                // console.log('FFmpeg log:', line);
                // Listen for showinfo lines containing pts_time/frame index for timestamp
                const match = line.match(/n:\s*(\d+).*pts_time:([0-9.]+)/);
                if (match) {
                    const idx = frameIdx++;
                    const timestamp = parseFloat(match[2]);
                    const frameEpochMs = Math.round(timestamp * 1000);

                    const tempName = path.join(outputDir, `temp_${String(idx).padStart(6, '0')}.jpg`);
                    const frameId = `${myid}_${String(idx)}_${frameEpochMs}.jpg`;
                    const framePath = path.join(outputDir, frameId);
                    // console.log('frampath: ', framePath);


                    // const framePath = path.join(outputDir, `frame_${String(idx).padStart(6, '0')}.jpg`);
                    pending++;
                    // Wait until file is written, then process (with delay to ensure IO readiness)
                    setTimeout(async () => {
                        try {
                            if (fs.existsSync(tempName)) {
                                // Rename temp file to custom-named file
                                fs.renameSync(tempName, framePath);

                                // const imageBuffer = fs.readFileSync(framePath);
                                // const prev = imageBuffer.toString('base64');
                                // console.log(prev.length);
                                // console.log('***************************************************************')
                                // const compressedBufferString = (await sharp(imageBuffer).resize(500,500).toBuffer()).toString('base64');
                                // imageBuffer.toString('base64');

                                // const s3Url = await uploadToS3(framePath, `group15/${frameId}`);

                                // console.log(s3Url);
                                // process.exit(0)

                                const frameInsertObj = createframeInsertTemplate(videoId, frameId);

                                insertManyArr.push(frameInsertObj)


                                frameBatch.push({ videoId, "frame_id": frameId, "image": video })

                                // Add to batch
                                if (frameBatch.length === frameLimit) {
                                    const insertManyRes = await insertMany(tableMap.frameTable, insertManyArr);
                                    await sendToQueue(rabbitMqQueues.framePreProcessing, { frames: frameBatch })
                                    frameBatch = [];
                                    insertManyArr = [];
                                }


                            }
                        } catch (err) {
                            errors.push(err);
                        } finally {
                            pending--;
                            checkDone();
                        }
                    }, 50); // Small delay to ensure file is on disk
                }
            })
            .on('error', reject)
            .on('end', async () => {
                if (frameBatch.length > 0 && insertManyArr.length > 0) {
                    // const insertManyRes = await insertMany(tableMap.frameTable, insertManyArr);

                    const queueRes = await sendToQueue(rabbitMqQueues.framePreProcessing, { frames: frameBatch })
                    // if (insertManyRes?.insertedIds?.length) {
                    //     console.log('Inserted frames;');

                    // }
                    frameBatch = [];
                    insertManyArr = [];
                }
                done = true;
                checkDone();
            })
            .run();
    });
}


// Usage
(async () => {
    // const outputDir = path.join(__dirname, 'frames');

    const fps = 1; // frames-per-second, e.g., every 200ms
    try {
        await getRabbitMQChannel();


        const ogVideoId = '688ea38e943ed6d4066a2d0c';

        const videoFolder = `chunks/${ogVideoId}/`;
        const outputDir = path.join(process.cwd(), videoFolder);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const videoChunks = await processVideo(video, outputDir, ogVideoId);

        const length = videoChunks.length;


        let idx = 0;
        let lastChunk = false;
        for (const chunk of videoChunks) {

            const splitArr = chunk.split('_');
            const time = splitArr[1];

            const start = time;
            const end = Number(time) + 10

            const newChunkName = `${ogVideoId}_${path.basename(chunk)}`;

            const insertObj = createframeInsertTemplate(ogVideoId, newChunkName);

            await insertOne(tableMap.frameTable, insertObj);
            const s3Url = await uploadVideoToS3(chunk, `group15/${path.basename(newChunkName)}`);
            await updateOne(tableMap.videoTable, { _id: getObjectId(ogVideoId) }, { $set: { processed_frame_cnt: length, s3Url } });

            if (idx === length - 1) {
                lastChunk = true;
            }

            await sendToQueue(rabbitMqQueues.framePreProcessing, { start, end, totalCount: length, videoId: ogVideoId, chunkId: newChunkName, url: s3Url, lastChunk })
            idx++;
        }

        console.log('All frames processed!');
    } catch (err) {
        console.error('Error:', err);
    }
})();