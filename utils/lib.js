const tableMap = {
    videoTable: 'tbl_video_uploads',
    frameTable: 'tbl_video_frame_uploads'
}

const rabbitMqQueues = {
    framePreProcessing :'video_frames_input_queue', 
    framePostProcessing: 'video_frames_output_queue'
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