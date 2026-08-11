import { FastifyInstance } from "fastify";
import { AdminController } from "./admin.controller";
import { adminGuard } from "@/core/auth.guard";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/core/validation.middleware";
import {
  commentIdParamSchema,
  contentIdParamSchema,
  createTherapistSchema,
  paginationQuerySchema,
  therapistIdParamSchema,
  updateTherapistSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userIdParamSchema,
  verifyTherapistSchema,
} from "./admin.schema";
import {
  AdminDashboardSchema,
  AdminUserDtoSchema,
  BlogDtoSchema,
  CommunityPostDtoSchema,
  LetterDtoSchema,
  OkSchema,
  ResourceDtoSchema,
  commonErrorResponses,
  docRoute,
  ok200,
  paginatedSchema,
} from "@/plugins/swagger";

const paginatedAdminUsers = paginatedSchema(AdminUserDtoSchema);

export async function adminRoutes(app: FastifyInstance) {
  const c = new AdminController();

  // Dashboard
  app.get(
    "/dashboard",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "Admin dashboard statistics",
        description: `
Aggregate platform counts for the admin console.

**Auth:** Admin only.

**Privacy:** Includes **counts** for journals/messages only — never content.
        `.trim(),
        auth: "admin",
        success: ok200(AdminDashboardSchema),
      }),
      preHandler: [adminGuard],
    },
    c.dashboard.bind(c),
  );

  // Users
  app.get(
    "/users",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "List users",
        description: `
Paginated user directory for moderation.

**Auth:** Admin only.
**Query:** page, limit.
        `.trim(),
        auth: "admin",
        querystring: paginationQuerySchema,
        success: ok200(paginatedAdminUsers),
      }),
      preHandler: [adminGuard, validateQuery(paginationQuerySchema)],
    },
    c.listUsers.bind(c),
  );

  app.get(
    "/users/:id",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "Get user by id",
        description: `Fetch a single user for admin management.`,
        auth: "admin",
        params: userIdParamSchema,
        success: ok200(AdminUserDtoSchema),
        errors: [404],
      }),
      preHandler: [adminGuard, validateParams(userIdParamSchema)],
    },
    c.getUser.bind(c),
  );

  app.patch(
    "/users/:id/status",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "Update user status",
        description: `
Set admin-managed account status.

**Status values:** ACTIVE | SUSPENDED | LOCKED

**Notes:** SUSPENDED/LOCKED users cannot login. Admins cannot use this to lock themselves out in invalid ways — see service rules.

**Errors:** \`ADMIN_INVALID_STATUS\`, \`ADMIN_TARGET_NOT_FOUND\`, \`ADMIN_CANNOT_MODIFY_SELF\` (where applicable).
        `.trim(),
        auth: "admin",
        params: userIdParamSchema,
        paramsExample: { id: "665f1a2b3c4d5e6f7a8b9c0d" },
        body: updateUserStatusSchema,
        bodyExample: { status: "SUSPENDED" },
        success: ok200(AdminUserDtoSchema),
        errors: [400, 404],
      }),
      preHandler: [
        adminGuard,
        validateParams(userIdParamSchema),
        validateBody(updateUserStatusSchema),
      ],
    },
    c.updateUserStatus.bind(c),
  );

  app.patch(
    "/users/:id/role",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "Update user role",
        description: `
Assign role USER or ADMIN.

**Auth:** Admin only.
**Restriction:** Administrators cannot change their own role (\`ADMIN_CANNOT_MODIFY_SELF\`).
        `.trim(),
        auth: "admin",
        params: userIdParamSchema,
        paramsExample: { id: "665f1a2b3c4d5e6f7a8b9c0d" },
        body: updateUserRoleSchema,
        bodyExample: { role: "ADMIN" },
        success: ok200(AdminUserDtoSchema),
        errors: [400, 404],
      }),
      preHandler: [
        adminGuard,
        validateParams(userIdParamSchema),
        validateBody(updateUserRoleSchema),
      ],
    },
    c.updateUserRole.bind(c),
  );

  // Blog moderation
  app.get(
    "/blog",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "List blog posts (moderation)",
        description: `Paginated blog posts for moderation (all statuses as implemented by admin service).`,
        auth: "admin",
        querystring: paginationQuerySchema,
        success: ok200(paginatedSchema(BlogDtoSchema)),
      }),
      preHandler: [adminGuard, validateQuery(paginationQuerySchema)],
    },
    c.listBlogs.bind(c),
  );

  app.delete(
    "/blog/:id",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "Delete blog post (moderation)",
        description: `Force-delete a blog post as administrator.`,
        auth: "admin",
        params: contentIdParamSchema,
        success: ok200(OkSchema, { ok: true }),
        errors: [404],
      }),
      preHandler: [adminGuard, validateParams(contentIdParamSchema)],
    },
    c.deleteBlog.bind(c),
  );

  // Community moderation — comments before :id to avoid shadowing
  app.delete(
    "/community/comments/:id",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "Delete community comment (moderation)",
        description: `Force-delete a community comment.`,
        auth: "admin",
        params: commentIdParamSchema,
        success: ok200(OkSchema, { ok: true }),
        errors: [404],
      }),
      preHandler: [adminGuard, validateParams(commentIdParamSchema)],
    },
    c.deleteCommunityComment.bind(c),
  );

  app.get(
    "/community",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "List community posts (moderation)",
        description: `Paginated community posts for moderation.`,
        auth: "admin",
        querystring: paginationQuerySchema,
        success: ok200(paginatedSchema(CommunityPostDtoSchema)),
      }),
      preHandler: [adminGuard, validateQuery(paginationQuerySchema)],
    },
    c.listCommunity.bind(c),
  );

  app.delete(
    "/community/:id",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "Delete community post (moderation)",
        description: `Force-delete a community post.`,
        auth: "admin",
        params: contentIdParamSchema,
        success: ok200(OkSchema, { ok: true }),
        errors: [404],
      }),
      preHandler: [adminGuard, validateParams(contentIdParamSchema)],
    },
    c.deleteCommunityPost.bind(c),
  );

  // Therapy resources
  app.get(
    "/resources",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "List therapy resources (moderation)",
        description: `Paginated therapy resources for moderation.`,
        auth: "admin",
        querystring: paginationQuerySchema,
        success: ok200(paginatedSchema(ResourceDtoSchema)),
      }),
      preHandler: [adminGuard, validateQuery(paginationQuerySchema)],
    },
    c.listResources.bind(c),
  );

  app.delete(
    "/resources/:id",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "Delete therapy resource (moderation)",
        description: `Force-delete a therapy resource.`,
        auth: "admin",
        params: contentIdParamSchema,
        success: ok200(OkSchema, { ok: true }),
        errors: [404],
      }),
      preHandler: [adminGuard, validateParams(contentIdParamSchema)],
    },
    c.deleteResource.bind(c),
  );

  // Public letters only
  app.get(
    "/letters",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "List public letters (moderation)",
        description: `
Paginated **public** letters only.

**Privacy:** Private letters are never listed or readable by admins.
        `.trim(),
        auth: "admin",
        querystring: paginationQuerySchema,
        success: ok200(paginatedSchema(LetterDtoSchema)),
      }),
      preHandler: [adminGuard, validateQuery(paginationQuerySchema)],
    },
    c.listLetters.bind(c),
  );

  app.delete(
    "/letters/:id",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "Delete public letter (moderation)",
        description: `Force-delete a public letter. Private letters remain inaccessible.`,
        auth: "admin",
        params: contentIdParamSchema,
        success: ok200(OkSchema, { ok: true }),
        errors: [403, 404],
      }),
      preHandler: [adminGuard, validateParams(contentIdParamSchema)],
    },
    c.deleteLetter.bind(c),
  );

  // Therapists roster (admin CRUD) + public PIN verify for therapist gate
  app.get(
    "/therapists",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "List therapists",
        description: `Paginated Safe Space therapist directory for the Admin Panel.`,
        auth: "admin",
        querystring: paginationQuerySchema,
        success: ok200(
          paginatedSchema({
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              specialty: { type: "string" },
              code: { type: "string" },
            },
          } as any),
        ),
      }),
      preHandler: [adminGuard, validateQuery(paginationQuerySchema)],
    },
    c.listTherapists.bind(c),
  );

  app.post(
    "/therapists",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "Register a therapist",
        description: `Create a therapist with a unique 4-digit access code.`,
        auth: "admin",
        body: createTherapistSchema,
        bodyExample: {
          name: "Dr. Avery Chen",
          specialty: "Emotional Support",
          code: "4821",
        },
        success: ok200({ type: "object" } as any),
        errors: [409],
      }),
      preHandler: [adminGuard, validateBody(createTherapistSchema)],
    },
    c.createTherapist.bind(c),
  );

  app.patch(
    "/therapists/:id",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "Update a therapist",
        description: `Update therapist profile, access code, or counters.`,
        auth: "admin",
        params: therapistIdParamSchema,
        body: updateTherapistSchema,
        success: ok200({ type: "object" } as any),
        errors: [404, 409],
      }),
      preHandler: [
        adminGuard,
        validateParams(therapistIdParamSchema),
        validateBody(updateTherapistSchema),
      ],
    },
    c.updateTherapist.bind(c),
  );

  app.delete(
    "/therapists/:id",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "Delete a therapist",
        description: `Remove a therapist. Their PIN login stops working immediately.`,
        auth: "admin",
        params: therapistIdParamSchema,
        success: ok200(OkSchema, { ok: true }),
        errors: [404],
      }),
      preHandler: [adminGuard, validateParams(therapistIdParamSchema)],
    },
    c.deleteTherapist.bind(c),
  );

  app.post(
    "/therapists/verify",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "Verify therapist name + access code",
        description: `
Therapist gate login (mode select). **Public** — no admin JWT.

Matches name + 4-digit code against the remote therapist roster, ensures a linked
User account (role therapist), updates last login, and returns JWT tokens so the
therapist can use Chat + Socket.IO as a real participant.
        `.trim(),
        auth: "public",
        body: verifyTherapistSchema,
        bodyExample: { name: "Dr. Avery Chen", code: "4821" },
        success: ok200({ type: "object" } as any),
        errors: [401],
      }),
      preHandler: [validateBody(verifyTherapistSchema)],
    },
    c.verifyTherapist.bind(c),
  );

  app.get(
    "/therapists/public",
    {
      ...docRoute({
        tags: ["Admin"],
        summary: "Public therapist roster (Safe Space matching)",
        description: `
Public list of therapists for user Safe Space session matching.
Does **not** expose access codes. Includes \`userId\` for conversation creation.
        `.trim(),
        auth: "public",
        success: ok200({ type: "object" } as any),
      }),
    },
    c.listTherapistsPublic.bind(c),
  );

  // Explicit privacy denials (no content ever returned)
  const privacyDenySchema = {
    ...docRoute({
      tags: ["Admin"],
      summary: "Privacy wall — access denied",
      description: `
**Explicit privacy denial endpoint.**

Journals and chat message content are **never** accessible to administrators.
These routes always return \`ADMIN_PRIVACY_VIOLATION\` (403).

Provided so clients and scanners receive a clear contract instead of accidental exposure.
      `.trim(),
      auth: "admin",
      errors: [403],
    }).schema,
    response: {
      403: {
        description: "Privacy violation — content never available to admins",
        ...commonErrorResponses[403],
        example: {
          success: false,
          data: null,
          error: {
            type: "ADMIN_PRIVACY_VIOLATION",
            message:
              "This content is private and not accessible to administrators",
          },
        },
      },
    },
  };

  app.get(
    "/journals",
    {
      schema: {
        ...privacyDenySchema,
        summary: "Journals list — always forbidden",
      },
      preHandler: [adminGuard],
    },
    c.denyJournals.bind(c),
  );
  app.get(
    "/journals/:id",
    {
      schema: {
        ...privacyDenySchema,
        summary: "Journal by id — always forbidden",
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "Journal id (never returned)" },
          },
        },
      },
      preHandler: [adminGuard],
    },
    c.denyJournals.bind(c),
  );
  app.get(
    "/chat",
    {
      schema: {
        ...privacyDenySchema,
        summary: "Chat list — always forbidden",
      },
      preHandler: [adminGuard],
    },
    c.denyChat.bind(c),
  );
  app.get(
    "/chat/:id",
    {
      schema: {
        ...privacyDenySchema,
        summary: "Chat by id — always forbidden",
        params: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Conversation id (content never returned)",
            },
          },
        },
      },
      preHandler: [adminGuard],
    },
    c.denyChat.bind(c),
  );
  app.get(
    "/messages",
    {
      schema: {
        ...privacyDenySchema,
        summary: "Messages list — always forbidden",
      },
      preHandler: [adminGuard],
    },
    c.denyChat.bind(c),
  );
  app.get(
    "/messages/:id",
    {
      schema: {
        ...privacyDenySchema,
        summary: "Message by id — always forbidden",
        params: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Message id (content never returned)",
            },
          },
        },
      },
      preHandler: [adminGuard],
    },
    c.denyChat.bind(c),
  );
}
