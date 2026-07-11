/**
 * Security Audit Logging Interface
 * Auth and security-sensitive modules depend on this — not on a concrete logger.
 */

export type SecurityAuditEventType =
  | "auth.register.success"
  | "auth.register.failure"
  | "auth.login.success"
  | "auth.login.failure"
  | "auth.recover.success"
  | "auth.recover.failure"
  | "auth.refresh.success"
  | "auth.refresh.failure"
  | "auth.refresh.reuse_detected"
  | "auth.logout"
  | "auth.lockout"
  | "auth.me"
  | "PROFILE_CREATED"
  | "PROFILE_UPDATED"
  | "AVATAR_UPDATED"
  | "COVER_UPDATED"
  | "PROFILE_VISIBILITY_CHANGED"
  | "BLOG_CREATED"
  | "BLOG_UPDATED"
  | "BLOG_DELETED"
  | "BLOG_PUBLISHED"
  | "COMMUNITY_POST_CREATED"
  | "COMMUNITY_POST_UPDATED"
  | "COMMUNITY_POST_DELETED"
  | "COMMUNITY_COMMENT_CREATED"
  | "COMMUNITY_COMMENT_UPDATED"
  | "COMMUNITY_COMMENT_DELETED"
  | "COMMUNITY_REACTION_ADDED"
  | "COMMUNITY_REACTION_REMOVED"
  | "JOURNAL_CREATED"
  | "JOURNAL_UPDATED"
  | "JOURNAL_DELETED"
  | "LETTER_CREATED"
  | "LETTER_UPDATED"
  | "LETTER_DELETED"
  | "LETTER_SENT"
  | "LETTER_READ"
  | "LETTER_ARCHIVED"
  | "RESOURCE_CREATED"
  | "RESOURCE_UPDATED"
  | "RESOURCE_DELETED"
  | "RESOURCE_PUBLISHED"
  | "CHAT_CONVERSATION_CREATED"
  | "CHAT_MESSAGE_SENT"
  | "CHAT_MESSAGE_READ"
  | "ADMIN_LOGIN"
  | "ADMIN_USER_UPDATED"
  | "ADMIN_CONTENT_DELETED"
  | "ADMIN_ROLE_UPDATED"
  | "ADMIN_STATUS_UPDATED";

export type SecurityAuditEvent = {
  type: SecurityAuditEventType;
  /** Never include passwords, passphrases, or raw tokens */
  requestId?: string;
  userId?: string;
  username?: string;
  ip?: string;
  userAgent?: string;
  reason?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  at?: Date;
};

export interface SecurityAuditLogger {
  log(event: SecurityAuditEvent): void | Promise<void>;
}
