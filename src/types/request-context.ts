export interface RequestContextUser {
  id: string;
  username?: string;
  role?: string;
  permissions?: string[];
  type?: string;
}

/**
 * Per-request context — populated by the context plugin and auth guard.
 */
export interface RequestContext {
  requestId: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  user?: RequestContextUser;
}
