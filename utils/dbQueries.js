const { getMongoDb } = require("../db/connection");

const tbl_video_uploads = 'tbl_video_uploads';
const frameTable = ''


const findOne = async (collection, query) => {
    try {
        const db = await getMongoDb();
        const res = await db.collection(collection).findOne(query);
        if (!res?._id) {
            return null;
        }
        return res;
    } catch (error) {
        console.error('Error in findone: ', error)
        return null;
    }
}

const insertOne = async (collection, insertObj) => {
    try {
        const db = await getMongoDb();
        const result = await db.collection(collection).insertOne(insertObj);
        if (result?.insertedId) {
            return result;
        }
        return null;
    } catch (error) {
        console.error('Error in findone: ', error)
        return null;
    }
}

const updateOne = async (collection, query, setObj) => {
    try {
        const db = await getMongoDb();
        const result = await db.collection(collection).updateOne(query, { $set: setObj });
        return {
            success: result?.acknowledged || false,
            modifiedCount: result?.modifiedCount || 0,
            matchedCount: result?.matchedCount || 0
        }
    } catch (error) {
        console.error('Error in findone: ', error)
        return null;
    }
}

const insertVideoInitialDetails = async (filename, serverName) => {
    try {
        const obj = {
            filename: { filename },
            server_filename: { serverName },
            filetype: 'video',
            upload_date: new date(),
            decision: 0,
            score: 0,
            review_type: 1,
            manual_decision: 0,
            detailed_issue_detected: {},
            file_status: 0
        }

        const result = await insertOne(tbl_video_uploads, obj);

        return result;
    } catch (error) {
        console.error('Error in insertVideoInitialDetails: ', error);
        return null;
    }
}


/**
 * Staus 
 * @param {boolean} status true/false
 * @param {string} videoId 
 * @param {string} filehash 
 * @param {Object} params 
 * @returns 
 */
const updateMongoSanity = async (failed, videoId, filehash, { blankFrames, blurry, audio, motion, aspectRatio, cropping, duplicate }) => {
    try {
        const find = { _id: videoId };

        const updateObj = {
            file_hash: filehash,
            file_status: 2
        }
        const dupCheck = await findOne(tbl_video_uploads, { file_hash: filehash });

        if (dupCheck) {
            failed = true;
        }

        if (failed) {
            detailed_issue_detected.empty = blankFrames ? 1 : 0;
            detailed_issue_detected.blurry = blurry ? 1 : 0;
            detailed_issue_detected.audio = audio || '';
            detailed_issue_detected.motion = motion || '';
            detailed_issue_detected.aspect_ratio = aspectRatio || '';
            detailed_issue_detected.cropping_needed = cropping === 'ok' ? 0 : 1;
            detailed_issue_detected.duplicate = dupCheck?._id ? 1 : 0;
            file_status = 4;
            decision = 2;
        }
        const result = await updateOne(tbl_video_uploads, find, updateObj);

        return result;
    } catch (error) {
        console.error('Error in updateMongoSanity: ', error);
        return null;
    }
}

const insertFrameDetails = async () => {
    try {
        cosnt 
    } catch (error) {
        console.error('Error in insertFrameDetails: ', error);
        return null;
        
    }
}

module.exports = {
    insertVideoInitialDetails,
    updateMongoSanity,
    insertOne,
    updateOne
}