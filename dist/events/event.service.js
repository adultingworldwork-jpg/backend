"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventService = void 0;
class EventService {
    constructor(queue) {
        this.queue = queue;
        this.listeners = new Map();
    }
    register(listener) {
        if (!this.listeners.has(listener.event)) {
            this.listeners.set(listener.event, []);
        }
        this.listeners.get(listener.event).push(listener);
    }
    async emit(event, payload) {
        const listeners = this.listeners.get(event) || [];
        for (const listener of listeners) {
            if (listener.async) {
                // send to queue
                await this.queue.add('events', event, {
                    event,
                    payload,
                });
            }
            else {
                // run immediately
                await listener.handler(payload);
            }
        }
    }
}
exports.EventService = EventService;
