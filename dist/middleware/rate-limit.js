"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitMiddleware = rateLimitMiddleware;
function rateLimitMiddleware(limit, windowSec) {
    return async (request, reply) => {
        const user = request.ctx.user;
        const key = `ratelimit:api:${user.tenantId}:${user.id}:${request.routerPath}`;
        const result = await request.server.rateLimit.hit(key, limit, windowSec);
        if (!result.allowed) {
            return reply.status(429).send({
                message: 'Too many requests',
            });
        }
    };
}
