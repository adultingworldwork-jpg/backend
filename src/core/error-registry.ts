/**
 * Standard Error Code Registry
 * Single source of truth for API error codes, HTTP status, and default messages.
 * Use AppError.fromCode() or throw new AppError(message, status, code).
 */

export const ErrorRegistry = {
  // Auth / security
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    statusCode: 401,
    message: "Authentication required",
  },
  INVALID_TOKEN: {
    code: "INVALID_TOKEN",
    statusCode: 401,
    message: "Invalid or expired token",
  },
  INVALID_CREDENTIALS: {
    code: "INVALID_CREDENTIALS",
    statusCode: 401,
    message: "Invalid credentials",
  },
  INVALID_REFRESH_TOKEN: {
    code: "INVALID_REFRESH_TOKEN",
    statusCode: 401,
    message: "Invalid or expired refresh token",
  },
  REFRESH_TOKEN_REUSE: {
    code: "REFRESH_TOKEN_REUSE",
    statusCode: 401,
    message: "Refresh token reuse detected. Please sign in again.",
  },
  ACCOUNT_LOCKED: {
    code: "ACCOUNT_LOCKED",
    statusCode: 423,
    message: "Account temporarily locked due to failed login attempts",
  },
  FORBIDDEN: {
    code: "FORBIDDEN",
    statusCode: 403,
    message: "Forbidden",
  },
  INVALID_RECOVERY: {
    code: "INVALID_RECOVERY",
    statusCode: 400,
    message: "Username and recovery passphrase do not match",
  },
  TERMS_REQUIRED: {
    code: "TERMS_REQUIRED",
    statusCode: 400,
    message: "You must accept the Community Agreement",
  },

  // Validation
  VALIDATION_ERROR: {
    code: "VALIDATION_ERROR",
    statusCode: 400,
    message: "Validation failed",
  },

  // User
  USER_NOT_FOUND: {
    code: "USER_NOT_FOUND",
    statusCode: 404,
    message: "User not found",
  },
  USERNAME_EXISTS: {
    code: "USERNAME_EXISTS",
    statusCode: 409,
    message: "Username is already taken",
  },
  /** @deprecated Product auth does not use email — retained for legacy references only */
  EMAIL_EXISTS: {
    code: "EMAIL_EXISTS",
    statusCode: 409,
    message: "Email already exists",
  },

  // Profile
  PROFILE_NOT_FOUND: {
    code: "PROFILE_NOT_FOUND",
    statusCode: 404,
    message: "Profile not found",
  },
  PROFILE_FORBIDDEN: {
    code: "PROFILE_FORBIDDEN",
    statusCode: 403,
    message: "You do not have permission to view this profile",
  },
  PROFILE_CREATE_FAILED: {
    code: "PROFILE_CREATE_FAILED",
    statusCode: 500,
    message: "Failed to create profile",
  },

  // Blog
  BLOG_NOT_FOUND: {
    code: "BLOG_NOT_FOUND",
    statusCode: 404,
    message: "Blog post not found",
  },
  BLOG_FORBIDDEN: {
    code: "BLOG_FORBIDDEN",
    statusCode: 403,
    message: "You do not have permission to modify this post",
  },
  BLOG_SLUG_EXISTS: {
    code: "BLOG_SLUG_EXISTS",
    statusCode: 409,
    message: "A post with this slug already exists",
  },

  // Community
  COMMUNITY_POST_NOT_FOUND: {
    code: "COMMUNITY_POST_NOT_FOUND",
    statusCode: 404,
    message: "Community post not found",
  },
  COMMUNITY_POST_FORBIDDEN: {
    code: "COMMUNITY_POST_FORBIDDEN",
    statusCode: 403,
    message: "You do not have permission to access this post",
  },
  COMMUNITY_COMMENT_NOT_FOUND: {
    code: "COMMUNITY_COMMENT_NOT_FOUND",
    statusCode: 404,
    message: "Comment not found",
  },
  COMMUNITY_COMMENT_FORBIDDEN: {
    code: "COMMUNITY_COMMENT_FORBIDDEN",
    statusCode: 403,
    message: "You do not have permission to modify this comment",
  },
  COMMUNITY_REACTION_NOT_FOUND: {
    code: "COMMUNITY_REACTION_NOT_FOUND",
    statusCode: 404,
    message: "Reaction not found",
  },

  // Journal (privacy: always 404 for non-owners — never reveal existence)
  JOURNAL_NOT_FOUND: {
    code: "JOURNAL_NOT_FOUND",
    statusCode: 404,
    message: "Journal entry not found",
  },

  // Letters
  LETTER_NOT_FOUND: {
    code: "LETTER_NOT_FOUND",
    statusCode: 404,
    message: "Letter not found",
  },
  LETTER_FORBIDDEN: {
    code: "LETTER_FORBIDDEN",
    statusCode: 403,
    message: "You do not have permission to perform this action on the letter",
  },
  LETTER_INVALID_STATE: {
    code: "LETTER_INVALID_STATE",
    statusCode: 400,
    message: "Letter is not in a valid state for this action",
  },

  // Therapy Resources
  RESOURCE_NOT_FOUND: {
    code: "RESOURCE_NOT_FOUND",
    statusCode: 404,
    message: "Resource not found",
  },
  RESOURCE_FORBIDDEN: {
    code: "RESOURCE_FORBIDDEN",
    statusCode: 403,
    message: "You do not have permission to modify this resource",
  },
  RESOURCE_SLUG_EXISTS: {
    code: "RESOURCE_SLUG_EXISTS",
    statusCode: 409,
    message: "A resource with this slug already exists",
  },

  // Chat
  CHAT_CONVERSATION_NOT_FOUND: {
    code: "CHAT_CONVERSATION_NOT_FOUND",
    statusCode: 404,
    message: "Conversation not found",
  },
  CHAT_FORBIDDEN: {
    code: "CHAT_FORBIDDEN",
    statusCode: 403,
    message: "You are not a participant in this conversation",
  },
  CHAT_INVALID_PARTICIPANT: {
    code: "CHAT_INVALID_PARTICIPANT",
    statusCode: 400,
    message: "Invalid conversation participant",
  },

  // Admin
  ADMIN_REQUIRED: {
    code: "ADMIN_REQUIRED",
    statusCode: 403,
    message: "Admin role required",
  },
  ADMIN_CANNOT_MODIFY_SELF: {
    code: "ADMIN_CANNOT_MODIFY_SELF",
    statusCode: 400,
    message: "Administrators cannot change their own role",
  },
  ADMIN_PRIVACY_VIOLATION: {
    code: "ADMIN_PRIVACY_VIOLATION",
    statusCode: 403,
    message: "This content is private and not accessible to administrators",
  },
  ADMIN_TARGET_NOT_FOUND: {
    code: "ADMIN_TARGET_NOT_FOUND",
    statusCode: 404,
    message: "Target resource not found",
  },
  ADMIN_INVALID_STATUS: {
    code: "ADMIN_INVALID_STATUS",
    statusCode: 400,
    message: "Invalid user status",
  },
  THERAPIST_NOT_FOUND: {
    code: "THERAPIST_NOT_FOUND",
    statusCode: 404,
    message: "Therapist not found",
  },
  THERAPIST_NAME_EXISTS: {
    code: "THERAPIST_NAME_EXISTS",
    statusCode: 409,
    message: "A therapist with this name already exists",
  },
  THERAPIST_CODE_EXISTS: {
    code: "THERAPIST_CODE_EXISTS",
    statusCode: 409,
    message: "This access code is already in use",
  },
  THERAPIST_INVALID_CREDENTIALS: {
    code: "THERAPIST_INVALID_CREDENTIALS",
    statusCode: 401,
    message: "Name or passcode is incorrect",
  },

  ADMIN_INVALID_ROLE: {
    code: "ADMIN_INVALID_ROLE",
    statusCode: 400,
    message: "Invalid role",
  },

  // Uploads
  UPLOAD_TOO_LARGE: {
    code: "UPLOAD_TOO_LARGE",
    statusCode: 400,
    message: "File too large",
  },
  UPLOAD_INVALID_TYPE: {
    code: "UPLOAD_INVALID_TYPE",
    statusCode: 400,
    message: "Invalid file type",
  },
  UPLOAD_NOT_FOUND: {
    code: "UPLOAD_NOT_FOUND",
    statusCode: 404,
    message: "Upload not found",
  },

  // System
  INTERNAL_SERVER_ERROR: {
    code: "INTERNAL_SERVER_ERROR",
    statusCode: 500,
    message: "Something went wrong",
  },
  NOT_READY: {
    code: "NOT_READY",
    statusCode: 503,
    message: "Service not ready",
  },
  NOT_IMPLEMENTED: {
    code: "NOT_IMPLEMENTED",
    statusCode: 501,
    message: "Not implemented",
  },
} as const;

export type ErrorCode = (typeof ErrorRegistry)[keyof typeof ErrorRegistry]["code"];

export type ErrorDefinition = {
  code: ErrorCode;
  statusCode: number;
  message: string;
};

/** Flat map used by AppError and existing call sites */
export const ErrorCodes = Object.fromEntries(
  Object.values(ErrorRegistry).map((e) => [e.code, e.code]),
) as { [K in ErrorCode]: K };

export function getErrorDefinition(code: ErrorCode): ErrorDefinition {
  const entry = Object.values(ErrorRegistry).find((e) => e.code === code);
  if (!entry) {
    return ErrorRegistry.INTERNAL_SERVER_ERROR;
  }
  return entry;
}
