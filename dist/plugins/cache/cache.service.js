"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
class CacheService {
    constructor(redis) {
        this.redis = redis;
    }
    serialize(value) {
        return JSON.stringify(value);
    }
    deserialize(value) {
        if (!value)
            return null;
        return JSON.parse(value);
    }
    async set(key, value, ttl) {
        const data = this.serialize(value);
        if (ttl) {
            await this.redis.set(key, data, 'EX', ttl);
        }
        else {
            await this.redis.set(key, data);
        }
    }
    async get(key) {
        const data = await this.redis.get(key);
        return this.deserialize(data);
    }
    async del(key) {
        await this.redis.del(key);
    }
    async remember(key, ttl, fn) {
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }
        const fresh = await fn();
        await this.set(key, fresh, ttl);
        return fresh;
    }
    async flush(pattern) {
        const keys = await this.redis.keys(pattern);
        if (keys.length) {
            await this.redis.del(...keys);
        }
    }
}
exports.CacheService = CacheService;
