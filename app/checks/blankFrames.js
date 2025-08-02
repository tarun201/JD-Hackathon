const ffmpeg = require('fluent-ffmpeg');

module.exports = function checkBlankFrames(videoPath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      const duration = metadata.format.duration;
      if (duration < 1) return resolve(true);
      resolve(false); // Simplified check
    });
  });
};