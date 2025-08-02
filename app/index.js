const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { runAllChecks } = require('./checksRunner');

const app = express();
// const upload = multer({ dest: 'uploads/' });
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// app.use(express.static('../frontend'));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/upload', upload.single('video'), async (req, res) => {
    const file = req.file;
    const results = await runAllChecks(file.path);
    res.json({ file: file.originalname, results });
});
  
app.post('/upload-bulk', upload.array('videos'), async (req, res) => {
    const results = {};
    for (const file of req.files) {
        results[file.originalname] = await runAllChecks(file.path);
    }
    res.json(results);
});

const PORT = 3030;
app.listen(PORT, () => console.log(`Server running on http://192.168.51.151:${PORT}`));
