const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const { execFile } = require('child_process');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);


const getVideoDuration = async (inputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (err) return reject(err);
            // metadata.format.duration is in seconds (float)
            resolve(metadata.format.duration);
        });
    });
}

async function getFrameCount(duration, fps) {
    return Math.floor(duration * fps);
}


module.exports = {
    getVideoDuration,
    getFrameCount
}