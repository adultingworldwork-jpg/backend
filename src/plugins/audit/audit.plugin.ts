import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { SecurityAuditLogger } from "@/core/interfaces/security-audit";
import { PinoSecurityAuditLogger } from "./audit.service";

declare module "fastify" {
  interface FastifyInstance {
    audit: SecurityAuditLogger;
  }
}

/**
 * Security audit logging plugin.
 * Decorates app.audit — auth module uses the interface only.
 */
async function auditPlugin(app: FastifyInstance) {
  const audit: SecurityAuditLogger = new PinoSecurityAuditLogger(app.log);
  app.decorate("audit", audit as SecurityAuditLogger);
  app.log.info("Security audit logger registered");
}

export default fp(auditPlugin, {
  name: "security-audit",
});
