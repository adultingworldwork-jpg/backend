/**
 * Shared OpenAPI component schemas matching the project's actual API contracts.
 * Envelope: { success, data, error }
 */

export const TAGS = {
  Authentication: {
    name: "Authentication",
    description:
      "Username-only anonymous-first auth. Register, login, recover password, refresh tokens, session introspection, and logout.",
  },
  Admin: {
    name: "Admin",
    description:
      "Administrator operations: dashboard stats, user management, and content moderation. Requires ADMIN role or admin.access permission. Private journals, chat messages, and private letters are never exposed.",
  },
  Profile: {
    name: "Profile",
    description:
      "User-facing profile presentation (display name, bio, media, visibility). Identity/auth fields live under Authentication.",
  },
  Blog: {
    name: "Blog",
    description:
      "Blog posts with draft/publish workflow, tags, and cover images.",
  },
  Community: {
    name: "Community",
    description:
      "Community feed posts, comments, and reactions (LIKE, SUPPORT, HUG, THANKFUL).",
  },
  Journal: {
    name: "Journal",
    description:
      "Private journal entries. Owner-only access — non-owners always receive 404 (existence is never leaked, including to admins).",
  },
  Letters: {
    name: "Letters",
    description:
      "Standalone emotional letters (not chat). PRIVATE requires a recipient; PUBLIC appears in the public feed after send.",
  },
  Resources: {
    name: "Resources",
    description:
      "Curated therapy / wellness resource library (content only — not booking).",
  },
  Chat: {
    name: "Chat",
    description:
      "1:1 conversations and message history. Realtime delivery uses Socket.IO (see project chat socket docs).",
  },
  Files: {
    name: "Files",
    description:
      "Multipart file uploads (images and PDFs) stored via Cloudinary when configured.",
  },
  Health: {
    name: "Health",
    description: "Liveness and readiness probes for load balancers and ops.",
  },
} as const;

export const OpenApiTags = Object.values(TAGS);

/** Standard success envelope wrapping `data`. */
export function successEnvelope(
  dataSchema: Record<string, unknown>,
  exampleData?: unknown,
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: "object",
    description: "Standard success response envelope",
    required: ["success", "data", "error"],
    properties: {
      success: {
        type: "boolean",
        const: true,
        description: "Always true for successful responses",
        example: true,
      },
      data: dataSchema,
      error: {
        type: "null",
        description: "Always null on success",
        example: null,
      },
    },
  };

  if (exampleData !== undefined) {
    schema.example = {
      success: true,
      data: exampleData,
      error: null,
    };
  }

  return schema;
}

/** Standard error envelope. */
export function errorEnvelope(opts: {
  description: string;
  exampleType: string;
  exampleMessage?: string;
  exampleDetails?: Array<{ field: string; message: string }>;
}): Record<string, unknown> {
  const errorProps: Record<string, unknown> = {
    type: {
      type: "string",
      description: "Machine-readable error code from the error registry",
      example: opts.exampleType,
    },
  };

  if (opts.exampleDetails) {
    errorProps.details = {
      type: "array",
      description: "Field-level validation issues (VALIDATION_ERROR only)",
      items: {
        type: "object",
        properties: {
          field: { type: "string", example: "username" },
          message: { type: "string", example: "Username is required" },
        },
      },
    };
  } else {
    errorProps.message = {
      type: "string",
      description: "Human-readable error message",
      example: opts.exampleMessage ?? "An error occurred",
    };
  }

  const exampleError: Record<string, unknown> = {
    type: opts.exampleType,
  };
  if (opts.exampleDetails) {
    exampleError.details = opts.exampleDetails;
  } else {
    exampleError.message = opts.exampleMessage ?? "An error occurred";
  }

  return {
    type: "object",
    description: opts.description,
    required: ["success", "data", "error"],
    properties: {
      success: {
        type: "boolean",
        const: false,
        example: false,
      },
      data: {
        type: "null",
        example: null,
      },
      error: {
        type: "object",
        properties: errorProps,
      },
    },
    example: {
      success: false,
      data: null,
      error: exampleError,
    },
  };
}

export const PaginationMetaSchema: Record<string, unknown> = {
  type: "object",
  description: "Pagination metadata for list endpoints",
  required: ["total", "page", "limit", "totalPages"],
  properties: {
    total: {
      type: "integer",
      description: "Total number of matching records",
      example: 42,
    },
    page: {
      type: "integer",
      description: "Current page (1-based)",
      example: 1,
    },
    limit: {
      type: "integer",
      description: "Page size",
      example: 20,
    },
    totalPages: {
      type: "integer",
      description: "Total pages (at least 1)",
      example: 3,
    },
  },
};

export function paginatedSchema(
  itemSchema: Record<string, unknown>,
  itemExample?: unknown,
): Record<string, unknown> {
  return {
    type: "object",
    required: ["items", "meta"],
    properties: {
      items: {
        type: "array",
        items: itemSchema,
      },
      meta: PaginationMetaSchema,
    },
    example: {
      items: itemExample !== undefined ? [itemExample] : [],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    },
  };
}

/** Common error responses attached to most endpoints. */
export const commonErrorResponses = {
  400: errorEnvelope({
    description: "Bad Request — validation failed or invalid input",
    exampleType: "VALIDATION_ERROR",
    exampleDetails: [
      { field: "password", message: "Password must be at least 8 characters" },
    ],
  }),
  401: errorEnvelope({
    description: "Unauthorized — missing/invalid Bearer token or credentials",
    exampleType: "UNAUTHORIZED",
    exampleMessage: "Authentication required",
  }),
  403: errorEnvelope({
    description: "Forbidden — authenticated but not allowed",
    exampleType: "FORBIDDEN",
    exampleMessage: "Forbidden",
  }),
  404: errorEnvelope({
    description: "Not Found — resource does not exist or is not visible",
    exampleType: "USER_NOT_FOUND",
    exampleMessage: "User not found",
  }),
  409: errorEnvelope({
    description: "Conflict — resource state conflict (e.g. duplicate username)",
    exampleType: "USERNAME_EXISTS",
    exampleMessage: "Username is already taken",
  }),
  423: errorEnvelope({
    description: "Locked — account temporarily locked after failed logins",
    exampleType: "ACCOUNT_LOCKED",
    exampleMessage: "Account temporarily locked due to failed login attempts",
  }),
  429: errorEnvelope({
    description: "Too Many Requests — rate limit exceeded",
    exampleType: "HTTP_ERROR",
    exampleMessage: "Rate limit exceeded",
  }),
  500: errorEnvelope({
    description: "Internal Server Error",
    exampleType: "INTERNAL_SERVER_ERROR",
    exampleMessage: "Something went wrong",
  }),
} as const;

// ── Domain DTO schemas (response data shapes) ─────────────────────────────

export const AttachmentSchema: Record<string, unknown> = {
  type: "object",
  description: "File attachment reference resolved from an upload",
  properties: {
    uploadId: {
      type: "string",
      description: "Upload document id (optional on older records)",
      example: "665f1a2b3c4d5e6f7a8b9c0d",
    },
    url: {
      type: "string",
      format: "uri",
      description: "Public CDN URL",
      example: "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
    },
  },
  required: ["url"],
};

export const AuthTokensSchema: Record<string, unknown> = {
  type: "object",
  required: ["accessToken", "refreshToken"],
  properties: {
    accessToken: {
      type: "string",
      description: "JWT access token — send as Authorization: Bearer <token>",
      example:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2NWYxYTJiM2M0ZDVlNmY3YThiOWMwZCIsInVzZXJuYW1lIjoiTW9vbkZsb3dlciJ9.signature",
    },
    refreshToken: {
      type: "string",
      description:
        "JWT refresh token — store securely; rotate on every /auth/refresh",
      example:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2NWYxYTJiM2M0ZDVlNmY3YThiOWMwZCIsInR5cGUiOiJyZWZyZXNoIn0.signature",
    },
  },
};

export const AuthenticatedUserSchema: Record<string, unknown> = {
  type: "object",
  description: "Authenticated user identity (no password or recovery fields)",
  required: ["id", "username", "usernameSlug", "permissions", "createdAt"],
  properties: {
    id: {
      type: "string",
      description: "User id (MongoDB ObjectId string)",
      example: "665f1a2b3c4d5e6f7a8b9c0d",
    },
    username: {
      type: "string",
      description: "Display username (preferred casing)",
      example: "MoonFlower",
    },
    usernameSlug: {
      type: "string",
      description: "URL-safe slug derived from username",
      example: "moonflower",
    },
    role: {
      type: ["string", "null"],
      description: "Role name (e.g. user, admin) or null",
      example: "user",
    },
    permissions: {
      type: "array",
      items: { type: "string" },
      description: "Permission strings from RBAC",
      example: [],
    },
    createdAt: {
      type: "string",
      format: "date-time",
      example: "2026-07-11T12:00:00.000Z",
    },
  },
};

export const AuthResultSchema: Record<string, unknown> = {
  type: "object",
  required: ["user", "tokens"],
  properties: {
    user: AuthenticatedUserSchema,
    tokens: AuthTokensSchema,
  },
};

export const ProfileDtoSchema: Record<string, unknown> = {
  type: "object",
  description: "Public or owner profile presentation",
  properties: {
    id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0e" },
    userId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
    username: {
      type: "string",
      description: "Auth username when included",
      example: "MoonFlower",
    },
    displayName: { type: "string", example: "Moon Flower" },
    bio: {
      type: "string",
      example: "Learning adulting one day at a time.",
    },
    avatar: {
      type: ["string", "null"],
      format: "uri",
      example: "https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg",
    },
    coverImage: {
      type: ["string", "null"],
      format: "uri",
      example: null,
    },
    pronouns: { type: "string", example: "they/them" },
    location: { type: "string", example: "Remote" },
    website: { type: "string", example: "https://example.com" },
    dateOfBirth: {
      type: ["string", "null"],
      description: "ISO date string or null",
      example: "1995-04-12",
    },
    visibility: {
      type: "string",
      enum: ["PUBLIC", "COMMUNITY", "PRIVATE"],
      example: "COMMUNITY",
    },
    preferences: {
      type: "object",
      additionalProperties: true,
      example: { theme: "dark" },
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    isOwner: {
      type: "boolean",
      description: "True when the viewer owns this profile",
      example: true,
    },
  },
};

export const BlogDtoSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c10" },
    authorId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
    title: { type: "string", example: "How I budgeted my first paycheck" },
    slug: { type: "string", example: "how-i-budgeted-my-first-paycheck" },
    excerpt: {
      type: "string",
      example: "A practical starter guide for first-job finances.",
    },
    content: {
      type: "string",
      example: "Full markdown or HTML body of the post…",
    },
    coverImage: {
      type: ["string", "null"],
      format: "uri",
      example: null,
    },
    tags: {
      type: "array",
      items: { type: "string" },
      example: ["budgeting", "career"],
    },
    status: {
      type: "string",
      enum: ["DRAFT", "PUBLISHED"],
      example: "PUBLISHED",
    },
    publishedAt: {
      type: ["string", "null"],
      format: "date-time",
      example: "2026-07-12T10:00:00.000Z",
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    isOwner: { type: "boolean", example: false },
  },
};

export const CommunityPostDtoSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c11" },
    authorId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
    content: {
      type: "string",
      example: "Feeling grateful for this community today.",
    },
    attachments: { type: "array", items: AttachmentSchema },
    visibility: {
      type: "string",
      enum: ["PUBLIC", "COMMUNITY"],
      example: "COMMUNITY",
    },
    commentsCount: { type: "integer", example: 3 },
    reactionsCount: { type: "integer", example: 12 },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    isOwner: { type: "boolean", example: false },
    myReaction: {
      type: ["string", "null"],
      enum: ["LIKE", "SUPPORT", "HUG", "THANKFUL", null],
      description: "Viewer's reaction if any",
      example: "SUPPORT",
    },
  },
};

export const CommunityCommentDtoSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c12" },
    postId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c11" },
    authorId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
    content: { type: "string", example: "Thank you for sharing this." },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    isOwner: { type: "boolean", example: true },
  },
};

export const CommunityReactionDtoSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c13" },
    postId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c11" },
    userId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
    type: {
      type: "string",
      enum: ["LIKE", "SUPPORT", "HUG", "THANKFUL"],
      example: "HUG",
    },
    createdAt: { type: "string", format: "date-time" },
  },
};

export const JournalDtoSchema: Record<string, unknown> = {
  type: "object",
  description: "Private journal entry (owner only)",
  properties: {
    id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c14" },
    ownerId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
    title: { type: "string", example: "Morning reflection" },
    content: { type: "string", example: "Today I practiced setting boundaries…" },
    mood: {
      type: "string",
      enum: [
        "HAPPY",
        "CALM",
        "SAD",
        "ANXIOUS",
        "STRESSED",
        "ANGRY",
        "HOPEFUL",
        "EXCITED",
        "TIRED",
        "OTHER",
      ],
      example: "HOPEFUL",
    },
    tags: {
      type: "array",
      items: { type: "string" },
      example: ["boundaries", "growth"],
    },
    attachments: { type: "array", items: AttachmentSchema },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

export const LetterDtoSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c15" },
    senderId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
    recipientId: {
      type: ["string", "null"],
      example: "665f1a2b3c4d5e6f7a8b9c99",
    },
    type: { type: "string", enum: ["PRIVATE", "PUBLIC"], example: "PRIVATE" },
    title: { type: "string", example: "A letter I never sent" },
    content: { type: "string", example: "I wanted you to know…" },
    mood: {
      type: "string",
      enum: [
        "HAPPY",
        "CALM",
        "SAD",
        "ANXIOUS",
        "STRESSED",
        "ANGRY",
        "HOPEFUL",
        "EXCITED",
        "TIRED",
        "OTHER",
      ],
      example: "SAD",
    },
    attachments: { type: "array", items: AttachmentSchema },
    status: {
      type: "string",
      enum: ["DRAFT", "SENT", "READ", "ARCHIVED"],
      example: "DRAFT",
    },
    deliveredAt: { type: ["string", "null"], format: "date-time" },
    readAt: { type: ["string", "null"], format: "date-time" },
    archivedAt: { type: ["string", "null"], format: "date-time" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    isSender: { type: "boolean", example: true },
    isRecipient: { type: "boolean", example: false },
  },
};

export const ResourceDtoSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c16" },
    authorId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
    title: { type: "string", example: "Grounding techniques for anxiety" },
    slug: { type: "string", example: "grounding-techniques-for-anxiety" },
    summary: {
      type: "string",
      example: "Quick exercises you can use anywhere.",
    },
    content: { type: "string", example: "Full resource body…" },
    category: { type: "string", example: "anxiety" },
    tags: {
      type: "array",
      items: { type: "string" },
      example: ["grounding", "anxiety"],
    },
    coverImage: { type: ["string", "null"], format: "uri", example: null },
    estimatedReadMinutes: { type: "integer", example: 5 },
    featured: { type: "boolean", example: true },
    status: {
      type: "string",
      enum: ["DRAFT", "PUBLISHED"],
      example: "PUBLISHED",
    },
    publishedAt: { type: ["string", "null"], format: "date-time" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    isOwner: { type: "boolean", example: false },
  },
};

export const ConversationDtoSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c17" },
    participantA: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0a" },
    participantB: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0b" },
    otherParticipantId: {
      type: "string",
      description: "The other user relative to the authenticated viewer",
      example: "665f1a2b3c4d5e6f7a8b9c0b",
    },
    lastMessageId: { type: ["string", "null"], example: null },
    lastMessageAt: { type: ["string", "null"], format: "date-time" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

export const MessageDtoSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c18" },
    conversationId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c17" },
    senderId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0a" },
    type: {
      type: "string",
      enum: ["TEXT", "IMAGE", "FILE", "SYSTEM"],
      example: "TEXT",
    },
    content: { type: "string", example: "Hey, are you free to talk?" },
    attachments: { type: "array", items: AttachmentSchema },
    deliveredAt: { type: ["string", "null"], format: "date-time" },
    readAt: { type: ["string", "null"], format: "date-time" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

export const UploadDtoSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c19" },
    purpose: {
      type: "string",
      enum: [
        "blog_cover",
        "book_cover",
        "book_pdf",
        "avatar",
        "cover",
        "general",
      ],
      example: "avatar",
    },
    originalName: { type: "string", example: "profile-photo.jpg" },
    mimeType: { type: "string", example: "image/jpeg" },
    size: {
      type: "integer",
      description: "File size in bytes",
      example: 245760,
    },
    publicId: {
      type: "string",
      description: "Cloudinary (or storage) public id",
      example: "adulting101/avatars/abc123",
    },
    url: {
      type: "string",
      format: "uri",
      example: "https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg",
    },
    resourceType: {
      type: "string",
      enum: ["image", "raw", "video", "auto"],
      example: "image",
    },
    ownerId: { type: ["string", "null"], example: "665f1a2b3c4d5e6f7a8b9c0d" },
    createdAt: { type: "string", format: "date-time" },
  },
};

export const AdminDashboardSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    totalUsers: { type: "integer", example: 1204 },
    activeUsers: { type: "integer", example: 1180 },
    profiles: { type: "integer", example: 1190 },
    blogPosts: { type: "integer", example: 86 },
    communityPosts: { type: "integer", example: 430 },
    comments: { type: "integer", example: 2100 },
    journalsCount: {
      type: "integer",
      description: "Count only — journal content is never readable by admin",
      example: 500,
    },
    lettersCount: { type: "integer", example: 90 },
    therapyResources: { type: "integer", example: 40 },
    conversationsCount: {
      type: "integer",
      description: "Count only — message content is never readable by admin",
      example: 300,
    },
    messagesCount: {
      type: "integer",
      description: "Count only — message content is never readable by admin",
      example: 12000,
    },
  },
};

export const AdminUserDtoSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
    username: { type: "string", example: "MoonFlower" },
    usernameSlug: { type: "string", example: "moonflower" },
    role: { type: ["string", "null"], example: "user" },
    status: {
      type: "string",
      enum: ["ACTIVE", "SUSPENDED", "LOCKED"],
      example: "ACTIVE",
    },
    failedLoginAttempts: { type: "integer", example: 0 },
    lockUntil: { type: ["string", "null"], format: "date-time", example: null },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: ["string", "null"], format: "date-time" },
  },
};

export const OkSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    ok: { type: "boolean", const: true, example: true },
  },
  required: ["ok"],
};
