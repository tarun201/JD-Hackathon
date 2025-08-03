const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// const { runAllChecks } = require('./app/checksRunner');
const app = express();
// const upload = multer({ dest: path.join(__dirname, 'uploads/') });

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
const storage = multer.diskStorage({
destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR); // Save to uploads/
},
filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${uniqueSuffix}-${safeName}`);
}
});
const upload = multer({ storage });
const {getMongoDb} = require('./db/connection')
const { fork } = require('child_process');
const {ObjectId} = require('mongodb');
// const { uploadToS3, uploadVideoToS3 } = require('./utils/aws.js');


app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/upload', upload.single('videos'), async (req, res) => {
    const file = req.file;
    const filePath = req.file.path;
    const uploadId = path.basename(filePath);
    console.log({uploadId})
    res.json({ uploadId });
    runChecksInBackground(uploadId, filePath);

});


app.post('/upload-bulk', upload.array('videos'), async (req, res) => {
    const uploadIds = [];
    // Respond immediately
    for (const file of req.files) {
      const filePath = file.path;
      console.log('Processing file:', filePath);
      const uploadId = path.basename(filePath);
      uploadIds.push(uploadId);
     
      // Process DB insert and checks in background
      (async () => {
          try {
              const insertObj = {
                  filename: file.originalname,
                  server_filename: uploadId,
                  filetype: 'video',
                  upload_date: new Date(),
                  decision: 0,
                  score: 0,
                  review_type: 1,
                  manual_decision: 0,
                  detailed_issue_detected: {},
                  file_status: 0
              };
              const resultsCollection = await getMongoDb();
              let response = await resultsCollection.collection('tbl_video_uploads').insertOne(insertObj);
            //   const newChunkName = `${response.insertedId}_${path.basename(uploadId)}`;
            //   await uploadVideoToS3(uploadId, `group15/${path.basename(newChunkName)}`);
              runChecksInBackground(uploadId, response.insertedId, filePath);
          } catch (e) {
              console.error('Error writing results:', e);
          }
      })();
    }
    res.json({ uploadIds }); // Send all IDs back immediately
});

app.post('/status', express.json(), (req, res) => {
    const { uploadIds } = req.body;
    console.log( 'Checking status for:', uploadIds);
    const statuses = uploadIds.map(id => {
      const resultPath = `results/${id}.json`;
      if (fs.existsSync(resultPath)) {
        const results = JSON.parse(fs.readFileSync(resultPath));
        return { uploadId: id, status: 'done', results };
      } else {
        return { uploadId: id, status: 'processing' };
      }
    });
  
    res.json({ statuses });
  });
  
function runChecksInBackground(uploadId,objectId, filePath) {
    const worker = fork(path.join(__dirname, './app/checkRunnerWorker.js'));
    worker.send({ uploadId,objectId, filePath });
}

const items = [
    { title: 'Item A', description: 'First item' },
    { title: 'Item B', description: 'Second item' }
];

app.get('/items', async (req, res) => {
    const db = await getMongoDb();
    const items =  await db.collection('tbl_video_uploads').find().sort({_id:-1}).toArray();
    res.json(items);
});

app.get('/details', async (req, res) => {
    console.log('Fetching details for ID:', req.query.id);
    const db = await getMongoDb();
    const items =  await db.collection('tbl_video_uploads').find({_id:new ObjectId(req.query.id)}).toArray();
    console.log(items);
    res.json(items);
});

const PORT = 3030;
app.listen(PORT, () => console.log(`Server running on http://192.168.51.151:${PORT}`));
