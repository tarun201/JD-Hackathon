const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

const ffmpegPath = require('ffmpeg-static');
const { getVideoDuration, getFrameCount } = require('../utils/videoProcessing.js');
const { getMongoDb } = require('../db/connection');
const { getRabbitMQChannel, sendToQueue, runConsumer } = require('../rabbitMq/connection.js');
// const ffprobePath = require('@ffprobe-installer/ffprobe').path;

ffmpeg.setFfmpegPath(ffmpegPath);
// ffmpeg.setFfprobePath(ffprobePath);

const video = 'https://stream.jdmagicbox.com/comp/hls/9999p5872.5872.190119234430.h2z4_5ezohiqfh05xemh.m3u8'



function detectSilentAudio(videoPath) {
    return new Promise((resolve, reject) => {
        let silenceDetected = [];

        ffmpeg(videoPath)
            .audioFilters('silencedetect=n=-50dB:d=0.5')
            .format('null')
            .on('stderr', (stderrLine) => {
                if (stderrLine.includes('silence_start:')) {
                    const match = stderrLine.match(/silence_start: ([\d\.]+)/);
                    if (match) silenceDetected.push({ type: 'start', time: parseFloat(match[1]) });
                }
            })
            .on('end', () => {
                resolve({ isMostlySilent: silenceDetected.length > 0, silenceDetected });
            })
            .save('/dev/null'); // Use 'NUL' on Windows
    });
}

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


async function extractFramesWithProcessing(inputPath, outputDir, fps, onFrameAsync) {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

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

        const myid = 'testtttt'

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
                    const customName = path.join(outputDir, `${myid}_${frameEpochMs}.jpg`);

                    // const framePath = path.join(outputDir, `frame_${String(idx).padStart(6, '0')}.jpg`);
                    pending++;
                    // Wait until file is written, then process (with delay to ensure IO readiness)
                    setTimeout(async () => {
                        try {
                            if (fs.existsSync(tempName)) {
                                // Rename temp file to custom-named file
                                fs.renameSync(tempName, customName);
                                await onFrameAsync(customName, idx, timestamp);
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
            .on('end', () => {
                done = true;
                checkDone();
            })
            .run();
    });
}

// Example async function to use per frame
async function analyzeFrame(framePath, idx, timestamp) {
    console.log(`Analyzing frame ${idx} at ${timestamp}s: ${framePath}`);
    // Perform your async operation here (ML model, OpenCV, etc.)
    await new Promise(res => setTimeout(res, 10000)); // Simulate async work
}

// Usage
(async () => {
    const outputDir = path.join(__dirname, 'frames');
    const fps = 5; // frames-per-second, e.g., every 200ms
    try {

        // const db = await getMongoDb();
        // const res = await db.collection('tbl_video_uploads').findOne();
        // console.log(res);

        // await getRabbitMQChannel();

        // await sendToQueue('framePreProcessing', 'test message');

        // await runConsumer()
        // process.exit();

        const duration = await getVideoDuration(video);
        // console.log('duration: ', duration);
        console.log('frames: ', await getFrameCount(duration, fps));
        const expectedFrames = Math.floor(duration * fps);
        // console.log('expected: ', expectedFrames);

        // // await getFrameCount(video)
        // // process.exit()
        // await extractFramesWithProcessing(video, outputDir, fps, analyzeFrame);
        // console.log('All frames processed!');
    } catch (err) {
        console.error('Error:', err);
    }
})();