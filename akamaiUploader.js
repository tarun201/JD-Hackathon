const fs = require('fs');
const path = require('path');
const EdgeGrid = require('@akamai/edgegrid');

const eg = new EdgeGrid({
  path: path.join(__dirname, '.edgerc'), // or use inline config
  section: 'default'
});

// destinationPath: relative path in NetStorage, e.g., /yourcpcode/video.mp4
async function uploadToAkamai(localPath, destinationPath) {
  const fileBuffer = fs.readFileSync(localPath);

  return new Promise((resolve, reject) => {
    eg.auth({
      method: 'PUT',
      path: `/1025${destinationPath}`,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileBuffer.length,
        'X-Akamai-ACS-Action': `version=1&action=upload&upload-type=binary`,
      },
      body: fileBuffer,
    });

    eg.send((error, response, body) => {
      if (error) return reject(error);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        resolve({ success: true });
      } else {
        reject(new Error(`Akamai upload failed: ${response.statusCode} - ${body}`));
      }
    });
  });
}

module.exports = { uploadToAkamai };
