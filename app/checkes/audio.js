const ffmpeg = require('fluent-ffmpeg');

module.exports = function checkAudio(videoPath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return resolve('error');
      const audioStreams = metadata.streams.filter(s => s.codec_type === 'audio');
      if (!audioStreams.length) return resolve('mute');

      const bitRate = parseInt(audioStreams[0].bit_rate || 0, 10);
      resolve(bitRate < 32000 ? 'low quality' : 'ok');
    });
  });
};