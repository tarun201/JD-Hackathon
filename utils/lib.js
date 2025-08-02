const tableMap = {
    videoTable: 'tbl_video_uploads',
    frameTable: 'tbl_video_frame_uploads'
}

const rabbitMqQueues = {
    framePreProcessing :'framePreProcessing', 
    framePostProcessing: 'framePostProcessing'
}

const createframeInsertTemplate = (videoId, frameId) => {
    return {
        '_id': frameId,
        'video_ref_id': videoId,
        'score': 0,
        'nudity': {},
        'contact_number': {},
        'branding': {},
        'watermark': {}
    }
}

module.exports = {
    createframeInsertTemplate,
    tableMap,
    rabbitMqQueues
}