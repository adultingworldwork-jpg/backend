"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresenceService = void 0;
class PresenceService {
    constructor(redis) {
        this.redis = redis;
    }
    async userConnected(userId, tenantId) {
        const userKey = `presence:user:${userId}`;
        const tenantKey = `presence:tenant:${tenantId}`;
        await this.redis.incr(userKey);
        await this.redis.sadd(tenantKey, userId);
    }
    async userDisconnected(userId, tenantId) {
        const userKey = `presence:user:${userId}`;
        const tenantKey = `presence:tenant:${tenantId}`;
        const count = await this.redis.decr(userKey);
        if (count <= 0) {
            await this.redis.del(userKey);
            await this.redis.srem(tenantKey, userId);
            // optional: last seen
            await this.redis.set(`presence:lastseen:${userId}`, Date.now());
        }
    }
    async isOnline(userId) {
        const count = await this.redis.get(`presence:user:${userId}`);
        return Number(count) > 0;
    }
    async getOnlineUsers(tenantId) {
        return this.redis.smembers(`presence:tenant:${tenantId}`);
    }
    async getLastSeen(userId) {
        const val = await this.redis.get(`presence:lastseen:${userId}`);
        return val ? Number(val) : null;
    }
}
exports.PresenceService = PresenceService;
