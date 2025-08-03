const md5File = require('md5-file');
const fs = require('fs');
const path = require('path');

const hashesPath = path.join(__dirname, '../hashes2.json');
let hashes = fs.existsSync(hashesPath) ? JSON.parse(fs.readFileSync(hashesPath)) : {};

module.exports = async function checkDuplicate(filePath) {
  const hash = await md5File(filePath);
  if (hashes[hash]) return true;

  hashes[hash] = true;
  fs.writeFileSync(hashesPath, JSON.stringify(hashes));
  return false;
};
