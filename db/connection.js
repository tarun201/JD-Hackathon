const { MongoClient, ObjectId } = require('mongodb');

let db = null;

const createMongoConnection = async () => {
    try {
        const pwd = encodeURIComponent('Group15#hackathon')
        const uri = `mongodb://group15:${pwd}@192.168.51.152:27017`

        const client = new MongoClient(uri);

        db = await client.connect();
        db = await db.db('db_group15');

        console.log('connected to mongodb ');

        return db;
    } catch (error) {
        console.error('Error creating MongoDB connection:', error);
        throw error;
    }
}

const getMongoDb = async () => {
    if (!db) {
        db = await createMongoConnection();
    }
    return db;
};

const getObjectId = (id) => {
    if (!id) return new ObjectId();

    return ObjectId(id);
}

module.exports = {
    getMongoDb,
    getObjectId
}