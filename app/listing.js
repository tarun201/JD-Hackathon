const {getMongoDb} = require('../../video-checker/db/connection')


let ll = function () { };

ll.listData = async function (req, res) {
    try {


const db = await getMongoDb();
const users =  await db.collection('tbl_video_uploads').find().toArray(); 

         
try {
    //console.log(users);
  } catch (err) {
    console.error('Query failed:', err);
  }	

        return users;

    }catch (err) {
        console.log('Caught on listdata', err);
        return 'ewewe';
    }
}


module.exports = ll;
