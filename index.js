const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { runAllChecks } = require('./app/checksRunner');
const listing = require('./app/listing');
const app = express();
console.log(__dirname)
// const upload = multer({ dest: 'uploads/' });
const upload = multer({ dest: 'uploads/' });
const {getMongoDb} = require('./db/connection')

// app.use(express.static('../frontend'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.post('/upload', upload.single('videos'), async (req, res) => {
    const file = req.file;
    // const results = await runAllChecks(file.path);
    // console.log({file})
    // res.json({ file: file.originalname, results });

    const filePath = req.file.path;
    const uploadId = path.basename(filePath);

    console.log({uploadId})

    // Respond immediately
    res.json({ uploadId });

    // Start background checks
    // runChecksInBackground(uploadId, filePath);
});
  
app.post('/upload-bulk', upload.array('videos'), async (req, res) => {
    // const results = {};
    // for (const file of req.files) {
    //     results[file.originalname] = await runAllChecks(file.path);
    // }
    // res.json(results);

    const uploadIds = [];

    req.files.forEach(file => {
        const filePath = file.path;
        const uploadId = path.basename(filePath);
        uploadIds.push(uploadId);

        // Start background check for each file
        //runChecksInBackground(uploadId, filePath);
    });
    console.log(uploadIds);

    res.json({ uploadIds }); // Send all IDs back immediately
});

const items = [
    { title: 'Item A', description: 'First item' },
    { title: 'Item B', description: 'Second item' }
];

app.get('/items', async (req, res) => {
    const db = await getMongoDb();
    const items =  await db.collection('tbl_video_uploads').find().toArray();

    console.log(items);
    res.json(items);
});

const PORT = 3030;
app.listen(PORT, () => console.log(`Server running on http://192.168.51.151:${PORT}`));
