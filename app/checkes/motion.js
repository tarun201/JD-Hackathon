const { exec } = require('child_process');
const path = require('path');

module.exports = function checkMotion(videoPath) {
  return new Promise((resolve) => {
    const pythonScript = path.join(__dirname, '../../utils/motion_detector.py');
    exec(`python3 ${pythonScript} "${videoPath}"`, (error, stdout) => {
      if (error) return resolve('undetermined');
      const result = stdout.trim();
      resolve(result === 'static');
    });
  });
};