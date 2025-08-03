const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage'); // For multipart uploads
const fs = require('fs');
const path = require('path');

const S3_BUCKET_NAME = 'jdhackathon2025'; // <--- IMPORTANT: Replace with your S3 bucket name
const S3_REGION = 'ap-south-1';

const s3Client = new S3Client({
    region: S3_REGION,
    credentials: { // Only needed if you're explicitly providing credentials here (NOT recommended for production)
        accessKeyId: '',
        secretAccessKey: '',
    },
    // For local development, the SDK will automatically look for credentials in:
    // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
    // 2. Shared credentials file (~/.aws/credentials)
    // 3. IAM roles (if running on EC2, ECS, Lambda, etc.)
});



const uploadToS3 = async (filePath, s3Key) => {
    try {
        const fileContent = await fs.readFile(filePath);

        // Set up the S3 upload parameters
        const uploadParams = {
            Bucket: S3_BUCKET_NAME,
            Key: s3Key, // The name of the file in S3
            Body: fileContent, // The content of the file
            ContentType: 'video/mp4' // <--- IMPORTANT: Adjust based on your image type (e.g., 'image/png', 'image/gif')
            // ACL: 'public-read' // Uncomment this if you want the object to be publicly readable (use with caution!)
        };

        // Create a PutObjectCommand
        const command = new PutObjectCommand(uploadParams);

        // Execute the command to upload
        console.log(`Uploading ${s3Key} to S3 bucket ${S3_BUCKET_NAME}...`);
        const data = await s3Client.send(command);

        return `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${s3Key}`
    } catch (error) {
        throw error;
    }


}

const uploadVideoToS3 = async (filePath, s3Key) => {
    try {
        // Ensure the file exists before attempting to read
        // if (!fs.existsSync(filePath)) {
        //     throw new Error(`Local file not found: ${filePath}`);
        // }

        // Create a readable stream from the local video file.
        // This is crucial for large files as it avoids loading the entire file into memory.
        const fileStream = fs.createReadStream(filePath);

        // Determine content type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream'; // Default generic type
        if (ext === '.mp4') contentType = 'video/mp4';
        else if (ext === '.mov') contentType = 'video/quicktime';
        else if (ext === '.webm') contentType = 'video/webm';
        else if (ext === '.avi') contentType = 'video/x-msvideo';
        // Add more video types as needed

        // Set up the S3 upload parameters for the Upload utility
        const uploadParams = {
            Bucket: S3_BUCKET_NAME,
            Key: s3Key, // The name of the file in S3 (e.g., 'videos/my-awesome-video.mp4')
            Body: fileStream, // The stream of the file content
            ContentType: contentType,
            ACL: 'public-read' // Uncomment this if you want the object to be publicly readable (use with caution!)
        };

        // Create an Upload utility instance. This handles multipart uploads automatically.
        const uploader = new Upload({
            client: s3Client,
            params: uploadParams,
            queueSize: 4, // Concurrency for parts (default is 4)
            partSize: 1024 * 1024 * 5, // Part size in bytes (default is 5MB)
        });

        // Listen for progress events
        uploader.on('httpUploadProgress', (progress) => {
            if (progress.total) {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                console.log(`Upload progress for ${s3Key}: ${percent}% (${progress.loaded}/${progress.total} bytes)`);
            }
        });

        // Execute the upload command
        console.log(`Starting upload of ${filePath} to S3 bucket ${S3_BUCKET_NAME} as ${s3Key}...`);
        const data = await uploader.done(); // `done()` returns the result of the completed upload

        console.log(`Video uploaded successfully to S3: ${s3Key}`);
        // data will contain properties like Bucket, Key, ETag, Location (if public)
        const s3ObjectUrl = `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${s3Key}`;
        console.log('S3 Object URL:', s3ObjectUrl);

        return s3ObjectUrl;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    uploadToS3,
    uploadVideoToS3
}