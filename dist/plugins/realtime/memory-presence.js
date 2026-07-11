"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryPresenceService = void 0;
/**
 * In-memory presence when Redis is not enabled.
 * Single-process only — fine for dev / single instance.
 */
class MemoryPresenceService {
    constructor() {
        this.counts = new Map();
        this.tenants = new Map();
    }
    async userConnected(userId, tenantId) {
        this.counts.set(userId, (this.counts.get(userId) || 0) + 1);
        if (!this.tenants.has(tenantId))
            this.tenants.set(tenantId, new Set());
        this.tenants.get(tenantId).add(userId);
    }
    async userDisconnected(userId, tenantId) {
        const next = (this.counts.get(userId) || 1) - 1;
        if (next <= 0) {
            this.counts.delete(userId);
            this.tenants.get(tenantId)?.delete(userId);
        }
        else {
            this.counts.set(userId, next);
        }
    }
    async isOnline(userId) {
        return (this.counts.get(userId) || 0) > 0;
    }
}
exports.MemoryPresenceService = MemoryPresenceService;
