const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const M3U8ToMp4 = require('m3u8-to-mp4');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

/**
 * Identify if the input is an M3U8 playlist or MP4 file by extension.
 * This simplistic method checks if string ends with ".m3u8" or ".mp4".
 * Can be improved to handle URLs or actual content-type checks.
 * @param {string} inputPathOrUrl
 * @returns {'m3u8' | 'mp4' | 'unknown'}
 */
function detectVideoType(inputPathOrUrl) {
    const lowerInput = inputPathOrUrl.toLowerCase();
    if (lowerInput.endsWith('.m3u8')) return 'm3u8';
    if (lowerInput.endsWith('.mp4')) return 'mp4';
    return 'unknown';
}
/**
 * Convert M3U8 playlist URL/path to MP4 file.
 * @param {string} m3u8Input M3U8 URL or file path
 * @param {string} mp4OutputPath Output MP4 path
 * @returns {Promise<string>} Resolves with mp4OutputPath on success
 */
function convertM3U8ToMp4(m3u8Input, mp4OutputPath) {
    return new Promise((resolve, reject) => {
        const converter = new M3U8ToMp4();
        converter
            .setInputFile(m3u8Input)
            .setOutputFile(mp4OutputPath)
            .start()
            .then(() => resolve(mp4OutputPath))
            .catch(reject);
    });
}
/**
 * Chop MP4 video into chunks sequentially, each resized to 144p (256x144), 10 fps,
 * and saved as .mp4
 * @param {string} inputPath input MP4 file path
 * @param {string} outputDir output directory for chunk files
 * @param {number} chunkDuration seconds length of chunks (default 10)
 * @param {number} outputFps output frames per second (default 10)
 * @returns {Promise<string[]>} resolves with array of chunk file paths
 */
async function chopVideoTo144pMp4ChunksSequential(inputPath, outputDir, videoId, chunkDuration = 10, outputFps = 10) {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, async (err, metadata) => {
            if (err) return reject(err);
            const duration = metadata.format.duration;
            if (!duration) return reject(new Error('Unable to get video duration'));
            const chunkFiles = [];
            try {
                for (let start = 0; start < duration; start += chunkDuration) {
                    const actualDuration = (start + chunkDuration > duration) ? (duration - start) : chunkDuration;
                    const outputPath = path.join(outputDir, `${videoId}_${start}_.mp4`);
                    chunkFiles.push(outputPath);
                    // Await processing of this chunk before continuing to next
                    await new Promise((res, rej) => {
                        ffmpeg(inputPath)
                            .setStartTime(start)
                            .setDuration(actualDuration)
                            .videoCodec('libx264')
                            .size('256x144')            // 144p resolution
                            .outputOptions([
                                '-preset veryfast',
                                '-movflags +faststart',
                                `-r ${outputFps}`         // set output frame rate to 10 fps
                            ])
                            .on('end', () => {
                                console.log(`Chunk created: ${outputPath}`);
                                res();
                            })
                            .on('error', (error) => {
                                console.error('FFmpeg ERROR:', error);
                                rej(error);
                            })
                            .save(outputPath);
                    });
                }
                resolve(chunkFiles);
            } catch (error) {
                reject(error);
            }
        });
    });
}
/**
 * Main processing function:
 * - Detect input type
 * - If m3u8 => convert to MP4 then chunk sequentially
 * - If mp4 => chunk sequentially
 *
 * @param {string} inputPathOrUrl Input file path or URL (mp4 or m3u8)
 * @param {string} outputDir Directory to save output chunks
 * @returns {Promise<string[]>} Resolves with list of chunk files
 */
async function processVideo(inputPathOrUrl, outputDir, videoId) {
    const videoType = detectVideoType(inputPathOrUrl);
    if (videoType === 'mp4') {
        // Direct sequential chunking with 144p and 10 fps
        return await chopVideoTo144pMp4ChunksSequential(inputPathOrUrl, outputDir, videoId, 10, 10);
    } else if (videoType === 'm3u8') {
        // First convert to MP4 then sequentially chunk with fps control
        const tempMp4 = path.join(outputDir, `${videoId}.mp4`);
        // Ensure output folder exists
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        console.log('Converting M3U8 playlist to MP4...');
        await convertM3U8ToMp4(inputPathOrUrl, tempMp4);
        console.log('Conversion complete:', tempMp4);
        const chunks = await chopVideoTo144pMp4ChunksSequential(tempMp4, outputDir, 10, 10);
        // Optionally delete temp MP4 after chunking, uncomment if desired:
        // fs.unlinkSync(tempMp4);
        return chunks;
    } else {
        throw new Error('Unsupported video type. Only mp4 and m3u8 inputs are supported.');
    }
}
// Example usage:
// const input = path.join(process.cwd(), 'chunks/temp_full_video.mp4'); // Replace with your input file or URL
// const outputDirectory = './output_chunks';
// processVideo(input, outputDirectory)
//     .then((chunks) => {
//         console.log('All chunks created:', chunks);
//     })
//     .catch((error) => {
//         console.error('Error processing video:', error);
//     });

module.exports = {
    processVideo
}