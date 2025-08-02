const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ffmpegPath = require('ffmpeg-static');
const { getVideoDuration, getFrameCount } = require('../utils/videoProcessing.js');
const { getRabbitMQChannel, sendToQueue, runConsumer } = require('../rabbitMq/connection.js');
const { createframeInsertTemplate, rabbitMqQueues, tableMap } = require('../utils/lib.js');
const { insertMany } = require('../utils/dbQueries.js');
const { uploadToS3 } = require('../utils/aws.js');

ffmpeg.setFfmpegPath(ffmpegPath);

const outputDir = path.join(process.cwd(), 'frames');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const video = 'https://www.sample-videos.com/video321/mp4/240/big_buck_bunny_240p_1mb.mp4'
const frameLimit = 5;



// function detectSilentAudio(videoPath) {
//     return new Promise((resolve, reject) => {
//         let silenceDetected = [];

//         ffmpeg(videoPath)
//             .audioFilters('silencedetect=n=-50dB:d=0.5')
//             .format('null')
//             .on('stderr', (stderrLine) => {
//                 if (stderrLine.includes('silence_start:')) {
//                     const match = stderrLine.match(/silence_start: ([\d\.]+)/);
//                     if (match) silenceDetected.push({ type: 'start', time: parseFloat(match[1]) });
//                 }
//             })
//             .on('end', () => {
//                 resolve({ isMostlySilent: silenceDetected.length > 0, silenceDetected });
//             })
//             .save('/dev/null'); // Use 'NUL' on Windows
//     });
// }

// detectSilentAudio('testvideo.mp4').then(result => {
//     console.log('Res: ', result);
// })

// async function getVideoDuration(inputPath) {
//     return new Promise((resolve, reject) => {
//         ffmpeg.ffprobe(inputPath, (err, metadata) => {
//             if (err) return reject(err);
//             // metadata.format.duration is in seconds (float)
//             resolve(metadata.format.duration);
//         });
//     });
// }


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
        const duration = await getVideoDuration(video);
        console.log('duration: ', duration);

        const expectedFrameCount = await getFrameCount(duration, fps);
        console.log('expected: ', expectedFrameCount);

        i = 0;
        while (true) {
            i++;
            await extractFramesWithProcessing(video, outputDir, fps, '688e45c5ff84a90c518b5dfb');
        }
        await extractFramesWithProcessing(video, outputDir, fps, '688e45c5ff84a90c518b5dfb');

        // console.log('All frames processed!');
    } catch (err) {
        console.error('Error:', err);
    }
})();