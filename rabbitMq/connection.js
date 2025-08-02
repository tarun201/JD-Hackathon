const amqp = require('amqplib');

const queues = ['framePreProcessing', 'framePostProcessing'];


const rabbitMqURI = `amqp://guest:guest@192.168.51.151:5672/`; //'amqp://localhost'
let channel = null;

async function connectToRabbitMQ() {
    try {
        if (!channel) {

            const connection = await amqp.connect(rabbitMqURI); // Or your RabbitMQ connection string | 'amqp://localhost'
            console.log('Connected to RabbitMQ', connection);

            channel = (await connection.createChannel());
            console.log('Channel created');

            // Assert queues
            queues.forEach(queue => {
                channel.assertQueue(queue);
                console.log(`Queue ${queue} asserted`)
            })
        }

        return channel;
    } catch (error) {
        console.error('Error connecting to RabbitMQ:', error);
        throw error;
    }
}

const getRabbitMQChannel = async () => await connectToRabbitMQ();

const sendToQueue = async (queue, message) => {
    try {
        const ch = await getRabbitMQChannel();
        const res = await ch.sendToQueue(queue, Buffer.from(JSON.stringify(message)))
        console.log('res: ', res);
        
    } catch (error) {
        console.error('Error sending to queue: ', error);
    }
}

async function runConsumer() {
    try {
        const ch = await getRabbitMQChannel()

        console.log('Waiting for messages...');

        ch.consume('framePreProcessing', (message) => {
            if (message) {
                console.log('Received:', message.content.toString());




                channel.ack(message); // Acknowledge the message
            } else {
                console.log('Consumer cancelled by server');
            }
        }, { noAck: false });

    } catch (error) {
        console.error('Error in consumer:', error);
    }
}

module.exports = {
    getRabbitMQChannel,
    sendToQueue,
    runConsumer
}