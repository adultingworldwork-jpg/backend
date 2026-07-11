"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const bullmq_1 = require("bullmq");
class QueueService {
    constructor(redis) {
        this.redis = redis;
        this.queues = new Map();
    }
    getQueue(name) {
        if (!this.queues.has(name)) {
            const queue = new bullmq_1.Queue(name, {
                // BullMQ embeds its own ioredis types; runtime Redis instance is compatible.
                connection: this.redis,
            });
            this.queues.set(name, queue);
        }
        return this.queues.get(name);
    }
    async add(queueName, jobName, data, options) {
        const queue = this.getQueue(queueName);
        await queue.add(jobName, data, {
            delay: options?.delay,
            attempts: options?.attempts ?? 3,
            removeOnComplete: options?.removeOnComplete ?? true,
        });
    }
}
exports.QueueService = QueueService;
