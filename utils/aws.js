const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs').promises;

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
            ContentType: 'image/jpeg' // <--- IMPORTANT: Adjust based on your image type (e.g., 'image/png', 'image/gif')
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

module.exports = {
    uploadToS3
}