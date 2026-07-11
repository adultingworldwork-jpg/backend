/**
 * In-memory presence when Redis is not enabled.
 * Single-process only — fine for dev / single instance.
 */
export class MemoryPresenceService {
  private counts = new Map<string, number>();
  private tenants = new Map<string, Set<string>>();

  async userConnected(userId: string, tenantId: string) {
    this.counts.set(userId, (this.counts.get(userId) || 0) + 1);
    if (!this.tenants.has(tenantId)) this.tenants.set(tenantId, new Set());
    this.tenants.get(tenantId)!.add(userId);
  }

  async userDisconnected(userId: string, tenantId: string) {
    const next = (this.counts.get(userId) || 1) - 1;
    if (next <= 0) {
      this.counts.delete(userId);
      this.tenants.get(tenantId)?.delete(userId);
    } else {
      this.counts.set(userId, next);
    }
  }

  async isOnline(userId: string): Promise<boolean> {
    return (this.counts.get(userId) || 0) > 0;
  }
}

export type PresenceLike = {
  userConnected(userId: string, tenantId: string): Promise<void>;
  userDisconnected(userId: string, tenantId: string): Promise<void>;
  isOnline(userId: string): Promise<boolean>;
};
