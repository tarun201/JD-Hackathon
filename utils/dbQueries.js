const { getMongoDb } = require("../db/connection");
const { tableMap } = require("./lib");

const tbl_video_uploads = 'tbl_video_uploads';
const frameTable = 'tbl_video_frame_uploads';


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
        console.error('Error in insertOne: ', error)
        return null;
    }
}

const insertMany = async (collection, insertArr) => {
    try {
        const db = await getMongoDb();
        const result = await db.collection(collection).insertMany(insertArr, { ordered: false });

        if (result?.insertedIds?.length) {
            return result;
        }
        return null;
    } catch (error) {
        console.error('Error in insertMany: ', error)
        return null;
    }
}

// const updateMany = async (collection, filter, pipeline) => {
//     try {
//         const db = await getMongoDb();
//         const result = await db.collection(collection).updateMany(filter, { $set: pipeline });

//         if (result?.insertedIds?.length) {
//             return result;
//         }
//         return null;
//     } catch (error) {
//         console.error('Error in updateMany: ', error)
//         return null;
//     }
// }

const updateOne = async (collection, query, pipeline) => {
    try {
        const db = await getMongoDb();
        const result = await db.collection(collection).updateOne(query, pipeline);
        return {
            success: result?.acknowledged || false,
            modifiedCount: result?.modifiedCount || 0,
            matchedCount: result?.matchedCount || 0
        }
    } catch (error) {
        console.error('Error in updateOne: ', error)
        return null;
    }
}

const findOneAndUpdate = async (collection, filter, pipeline, options) => {
    try {
        const db = await getMongoDb();
        if (!options?.returnDocument) {
            options = {
                ...options,
                returnDocument: 'after'
            };
        }
        const result = await db.collection(collection).findOneAndUpdate(filter, pipeline, options);
        // console.log('findOneAndUpdate result:', result);
        
        if (result?.value) { // The updated document is in the 'value' property
            console.log('Successfully updated and retrieved frame:');
            console.log(result.value);
            return result.value;
        }
    } catch (error) {
        console.error('Error in findOneAndUpdate: ', error);
        return null;
    }
}

const insertVideoInitialDetails = async (filename, serverName) => {
    try {
        const obj = {
            filename: filename,
            server_filename: serverName,
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
        const result = await updateOne(tbl_video_uploads, find, { $set: updateObj });

        return result;
    } catch (error) {
        console.error('Error in updateMongoSanity: ', error);
        return null;
    }
}

const insertInitialFrameDetails = async (videoId, frameId) => {
    try {
        const res = await insertOne(frameTable, {
            'video_ref_id': videoId,
            '_id': frameId,
            'score': 0,
            'nudity': {},
            'contact_number': {},
            'branding': {},
            'watermark': {}

        })
    } catch (error) {
        console.error('Error in insertFrameDetails: ', error);
        return null;

    }
}

const updateFrameDetails = async (filter, updateDoc) => {
    try {
        const updateObj = {
            $set: { 'nudity.nflag': 1, 'score': 67.98 },
            $push: { 'nudity.details': { 'frame_time_in_sec': 45, 'lvl': 'full' } }

        }

        const updateRes = await updateOne(tableMap.frameTable, filter, updateObj)
    } catch (error) {
        console.error('Error in updateFrameDetails: ', error);
        return null;
    }
}



module.exports = {
    insertVideoInitialDetails,
    updateMongoSanity,
    insertOne,
    updateOne,
    insertMany,
    insertInitialFrameDetails,
    updateFrameDetails,
    findOneAndUpdate
}