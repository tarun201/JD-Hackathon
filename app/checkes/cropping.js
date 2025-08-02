const { exec } = require('child_process');

module.exports = function checkCropping(videoPath) {
  return new Promise((resolve) => {
    const cropDetectCmd = `ffmpeg -i "${videoPath}" -t 2 -vf cropdetect -f null - 2>&1`;
    exec(cropDetectCmd, (err, stdout) => {
      if (err) return resolve('error');
      const cropMatches = stdout.match(/crop=\S+/g);
      if (!cropMatches || cropMatches.length === 0) return resolve('no bars');

      const uniqueCrops = [...new Set(cropMatches)];
      if (uniqueCrops.length > 1) return resolve('black bars');
      resolve('ok');
    });
  });
};