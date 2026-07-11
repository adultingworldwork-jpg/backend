"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
class AuthController {
    async register(request, reply) {
        const result = await request.services.auth.register(request.body);
        return reply.success(result, 201);
    }
    async login(request, reply) {
        const result = await request.services.auth.login(request.body);
        return reply.success(result);
    }
    async recover(request, reply) {
        const result = await request.services.auth.recover(request.body);
        return reply.success(result);
    }
    async refresh(request, reply) {
        const { refreshToken } = request.body;
        const tokens = await request.services.auth.refresh(refreshToken);
        return reply.success({ tokens });
    }
    async me(request, reply) {
        const userId = request.ctx.user?.id;
        if (!userId) {
            return reply.success(null);
        }
        const user = await request.services.auth.me(userId);
        return reply.success(user);
    }
    async logout(request, reply) {
        const body = (request.body || {});
        const result = await request.services.auth.logout(request.ctx.user?.id, body.refreshToken);
        return reply.success(result);
    }
}
exports.AuthController = AuthController;
