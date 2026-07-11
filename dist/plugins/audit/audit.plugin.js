"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const audit_service_1 = require("./audit.service");
/**
 * Security audit logging plugin.
 * Decorates app.audit — auth module uses the interface only.
 */
async function auditPlugin(app) {
    const audit = new audit_service_1.PinoSecurityAuditLogger(app.log);
    app.decorate("audit", audit);
    app.log.info("Security audit logger registered");
}
exports.default = (0, fastify_plugin_1.default)(auditPlugin, {
    name: "security-audit",
});
