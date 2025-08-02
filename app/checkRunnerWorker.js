const { runAllChecks } = require('./checksRunner');
const { getMongoDb } = require('../db/connection');
const { ObjectId } = require('mongodb');
const fs = require('fs');

process.on('message', async ({ uploadId,objectId, filePath }) => {
  const results = await runAllChecks(filePath); // same as your current checkRunner logic
  console.log('Results:', results);
  fs.writeFileSync(`results/${uploadId}.json`, JSON.stringify(results));
  process.send({ status: 'done', uploadId });
if (
    results.duplicate === true || 
    results.blankFrames === true || 
    results.blurry === true || 
    results.audio != 'ok' || 
    // results.aspectRatio === 'non-standard' || 
    results.cropping != 'ok'
) {
    var updateObj = {
        detailed_issue_detected: {
            empty: results.blankFrames ? 1 : 0,
            blurry: results.blurry ? 1 : 0,
            audio: results.audio || '',
            // aspect_ratio: results.aspectRatio || '',
            cropping_needed: results.cropping === 'ok' ? 0 : 1,
            duplicate: results.duplicate ? 1 : 0,
        },
        file_status: 4,
        decision: 2,
    };
 }else{
    var updateObj = {
        file_status: 2
    };
 }
  let resultsCollection = await getMongoDb();
  const find = { _id: new ObjectId(objectId) };
  await resultsCollection.collection('tbl_video_uploads').updateOne(find, { $set: updateObj });
  process.exit(0);
});

