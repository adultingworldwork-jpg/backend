"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitService = void 0;
class RateLimitService {
    constructor(redis) {
        this.redis = redis;
    }
    async hit(key, limit, windowSec) {
        const current = await this.redis.incr(key);
        if (current === 1) {
            await this.redis.expire(key, windowSec);
        }
        const remaining = Math.max(limit - current, 0);
        return {
            allowed: current <= limit,
            remaining,
        };
    }
}
exports.RateLimitService = RateLimitService;
