const ffmpeg = require('fluent-ffmpeg');

module.exports = function checkAspectRatio(videoPath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return resolve('error');
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const { width, height } = videoStream;
      const ratio = (width / height).toFixed(2);
      // console.log('Aspect Ratio:', ratio);
      if (ratio >= 1.7 && ratio <= 1.8) {
        resolve('16:9');
      } else if (ratio <= 0.6) {
        resolve('vertical');
      } else {
        resolve('non-standard');
      }
    });
  });
};