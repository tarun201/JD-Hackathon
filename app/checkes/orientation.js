const ffmpeg = require('fluent-ffmpeg');

module.exports = function checkOrientation(videoPath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return resolve('error');
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (!videoStream) return resolve('error');
      const { width, height } = videoStream;
      resolve(width > height ? 'landscape' : 'portrait');
    });
  });
};