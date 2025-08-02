const { getRabbitMQChannel } = require("../rabbitMq/connection");
const { rabbitMqQueues } = require("../utils/lib");


const postProcessing = async () => {
    try {
        const ch = await getRabbitMQChannel()

        console.log('Waiting for messages...');
        ch.consume(rabbitMqQueues.framePostProcessing, (message) => {
            if (message) {
                console.log('Received:', message.content.toString());

                


                channel.ack(message); // Acknowledge the message
            } else {
                console.log('Consumer cancelled by server');
            }
        }, { noAck: false });


    } catch (error) {

    }
}