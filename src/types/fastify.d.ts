import "fastify";
import { Logger } from "pino";
import { RequestContext } from "./request-context";
import { Services } from "./services";
import { StorageService } from "@/core/interfaces/storage";
import { SecurityAuditLogger } from "@/core/interfaces/security-audit";
import type { JwtSignPayload, TokenType, UserType } from "@/plugins/jwt.plugin";

declare module "fastify" {
  interface FastifyInstance {
    logger: Logger;
    db: {
      connect(): Promise<void>;
      disconnect(): Promise<void>;
      getClient(): unknown;
    };
    storage?: StorageService;
    audit: SecurityAuditLogger;
    jwt: {
      sign: (
        payload: JwtSignPayload,
        userType: UserType,
        tokenType: TokenType,
      ) => string;
      verifyToken: (token: string) => any;
      verifyAccess: (token: string) => any;
      verifyRefresh: (token: string) => any;
      refresh: (refreshToken: string) => {
        accessToken: string;
      };
    };
  }

  interface FastifyReply {
    success: (data: any, statusCode?: number) => void;
    error: (error: any, statusCode?: number) => void;
  }

  interface FastifyRequest {
    user?: any;
    requestId: string;
    ctx: RequestContext;
    services: Services;
    startTime: [number, number];
  }
}