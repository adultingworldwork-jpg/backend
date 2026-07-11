import { FastifyRequest, FastifyReply } from "fastify";
import { AppError } from "@/utils/app-error";

type JwtPayload = {
  id: string;
  username?: string;
  role?: string;
  permissions?: string[];
  type?: string;
  userType?: string;
};

export async function authGuard(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    request.log.warn("Missing Authorization header");
    throw AppError.fromCode("UNAUTHORIZED");
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    request.log.warn({ authHeader }, "Invalid Authorization format");
    throw AppError.fromCode("INVALID_TOKEN", "Invalid token format");
  }

  try {
    const decoded = request.server.jwt.verifyAccess(token) as JwtPayload;

    request.ctx.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      permissions: decoded.permissions,
      type: decoded.userType || decoded.type,
    };

    request.log = request.log.child({
      userId: decoded.id,
      username: decoded.username,
      role: decoded.role,
      requestId: request.ctx.requestId,
    });

    request.log.debug("User authenticated");
  } catch (error) {
    request.log.warn({ error }, "Token verification failed");
    throw AppError.fromCode("INVALID_TOKEN");
  }
}

/**
 * Attach user when a Bearer token is present; otherwise continue anonymously.
 * Used for visibility-gated public profile reads.
 */
export async function optionalAuthGuard(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authHeader = request.headers.authorization;
  if (!authHeader) return;
  await authGuard(request, reply);
}

/**
 * Require authenticated ADMIN role (or admin.access permission).
 * Must run after authGuard, or include auth itself.
 */
export async function adminGuard(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await authGuard(request, reply);

  const role = (request.ctx.user?.role || "").toLowerCase();
  const permissions = request.ctx.user?.permissions || [];
  const isAdmin =
    role === "admin" || permissions.includes("admin.access");

  if (!isAdmin) {
    request.log.warn(
      { userId: request.ctx.user?.id, role },
      "Admin access denied",
    );
    throw AppError.fromCode("ADMIN_REQUIRED");
  }
}
