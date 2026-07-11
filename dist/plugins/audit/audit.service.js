"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PinoSecurityAuditLogger = void 0;
/**
 * Pino-backed security audit logger.
 * Writes structured events; never logs secrets.
 */
class PinoSecurityAuditLogger {
    constructor(logger) {
        this.logger = logger;
    }
    log(event) {
        const payload = {
            audit: true,
            type: event.type,
            requestId: event.requestId,
            userId: event.userId,
            username: event.username,
            ip: event.ip,
            userAgent: event.userAgent,
            reason: event.reason,
            metadata: event.metadata,
            at: (event.at ?? new Date()).toISOString(),
        };
        const failure = event.type.endsWith(".failure") ||
            event.type.includes("reuse") ||
            event.type === "auth.lockout";
        if (failure) {
            this.logger.warn(payload, `security_audit:${event.type}`);
        }
        else {
            this.logger.info(payload, `security_audit:${event.type}`);
        }
    }
}
exports.PinoSecurityAuditLogger = PinoSecurityAuditLogger;
