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



// const video = path.join(process.cwd(), 'app/uploads/dirty.mp4');;



// Usage
const pushToLLM = async (video, ogVideoId) => {
    // const outputDir = path.join(__dirname, 'frames');

    const fps = 1; // frames-per-second, e.g., every 200ms
    try {
        await getRabbitMQChannel();


        // const ogVideoId = '688ea38e943ed6d4066a2d0c';

        const ogVideoS3Url = await uploadVideoToS3(video, `group15/${path.basename(ogVideoId)}`);

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
            await updateOne(tableMap.videoTable, { _id: getObjectId(ogVideoId) }, { $set: { processed_frame_cnt: length, ogVideoS3Url } });

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
};

module.exports = {
    pushToLLM
}