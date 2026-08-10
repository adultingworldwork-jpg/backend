import { FastifyRequest, FastifyReply } from "fastify";
import {
  AdminLoginInput,
  LoginInput,
  LogoutInput,
  RecoverInput,
  RefreshInput,
  RegisterInput,
} from "./auth.schema";

export class AuthController {
  async register(request: FastifyRequest, reply: FastifyReply) {
    const result = await request.services.auth.register(
      request.body as RegisterInput,
    );
    return reply.success(result, 201);
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const result = await request.services.auth.login(
      request.body as LoginInput,
    );
    return reply.success(result);
  }

  /** Admin Panel password-only login (single password field). */
  async adminLogin(request: FastifyRequest, reply: FastifyReply) {
    const result = await request.services.auth.adminLogin(
      request.body as AdminLoginInput,
    );
    return reply.success(result);
  }

  async recover(request: FastifyRequest, reply: FastifyReply) {
    const result = await request.services.auth.recover(
      request.body as RecoverInput,
    );
    return reply.success(result);
  }

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const { refreshToken } = request.body as RefreshInput;
    const tokens = await request.services.auth.refresh(refreshToken);
    return reply.success({ tokens });
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.ctx.user?.id;
    if (!userId) {
      return reply.success(null);
    }
    const user = await request.services.auth.me(userId);
    return reply.success(user);
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const body = (request.body || {}) as LogoutInput;
    const result = await request.services.auth.logout(
      request.ctx.user?.id,
      body.refreshToken,
    );
    return reply.success(result);
  }
}
