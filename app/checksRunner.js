const blankFrames = require('./checks/blankFrames');
const blurry = require('./checks/blurry');
const orientation = require('./checks/orientation');
const audio = require('./checks/audio');
const motion = require('./checks/motion');
const aspectRatio = require('./checks/aspectRatio');
const cropping = require('./checks/cropping');
const duplicate = require('./checks/duplicate');

async function runAllChecks(filepath) {
  return {
    blankFrames: await blankFrames(filepath),
    blurry: await blurry(filepath),
    orientation: await orientation(filepath),
    audio: await audio(filepath),
    motion: await motion(filepath),
    aspectRatio: await aspectRatio(filepath),
    cropping: await cropping(filepath),
    duplicate: await duplicate(filepath)
  };
}

module.exports = { runAllChecks };
