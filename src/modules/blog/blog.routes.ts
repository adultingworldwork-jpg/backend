import { FastifyInstance } from "fastify";
import { BlogController } from "./blog.controller";
import { authGuard, optionalAuthGuard } from "@/core/auth.guard";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/core/validation.middleware";
import {
  blogIdParamSchema,
  blogListQuerySchema,
  blogSlugParamSchema,
  blogTagParamSchema,
  createBlogSchema,
  updateBlogSchema,
} from "./blog.schema";
import {
  BlogDtoSchema,
  OkSchema,
  created201,
  docRoute,
  ok200,
  paginatedSchema,
} from "@/plugins/swagger";

const paginatedBlogs = paginatedSchema(BlogDtoSchema);

export async function blogRoutes(app: FastifyInstance) {
  const controller = new BlogController();

  app.post(
    "/",
    {
      ...docRoute({
        tags: ["Blog"],
        summary: "Create a blog post",
        description: `
Create a draft or published blog post for the authenticated author.

**Who should use it:** Authors writing long-form content.

**Business purpose:** Persist title/content/tags with optional cover image.

**Body highlights:**
- \`title\` 1–200, \`content\` required (max 100k)
- \`tags\` max 20 (normalized lowercase)
- \`coverImage\` URL or null; or \`coverUploadId\` to resolve from Files
- \`status\`: DRAFT (default) | PUBLISHED

**Postconditions:** Post created; slug generated uniquely; if PUBLISHED, \`publishedAt\` set.
        `.trim(),
        auth: "bearer",
        body: createBlogSchema,
        bodyExample: {
          title: "How I budgeted my first paycheck",
          content: "Start with needs, then savings, then wants…",
          excerpt: "A practical starter guide for first-job finances.",
          tags: ["budgeting", "career"],
          coverImage: null,
          status: "DRAFT",
        },
        success: created201(BlogDtoSchema),
        errors: [400, 409],
      }),
      preHandler: [authGuard, validateBody(createBlogSchema)],
    },
    controller.create.bind(controller),
  );

  app.get(
    "/",
    {
      ...docRoute({
        tags: ["Blog"],
        summary: "List published blog posts",
        description: `
Paginated feed of **published** posts (newest first).

**Auth:** Optional Bearer — owners get \`isOwner: true\` when applicable.

**Query:** \`page\` (default 1), \`limit\` (default 20, max 100).
        `.trim(),
        auth: "optional",
        querystring: blogListQuerySchema,
        success: ok200(paginatedBlogs),
      }),
      preHandler: [optionalAuthGuard, validateQuery(blogListQuerySchema)],
    },
    controller.listPublished.bind(controller),
  );

  app.get(
    "/me",
    {
      ...docRoute({
        tags: ["Blog"],
        summary: "List my blog posts",
        description: `
List all posts owned by the authenticated user (drafts + published).

**Who should use it:** Author dashboard.
        `.trim(),
        auth: "bearer",
        querystring: blogListQuerySchema,
        success: ok200(paginatedBlogs),
      }),
      preHandler: [authGuard, validateQuery(blogListQuerySchema)],
    },
    controller.mine.bind(controller),
  );

  app.get(
    "/tag/:tag",
    {
      ...docRoute({
        tags: ["Blog"],
        summary: "List published posts by tag",
        description: `
Filter published posts by a single tag (path param).

**Auth:** Optional Bearer.
        `.trim(),
        auth: "optional",
        params: blogTagParamSchema,
        querystring: blogListQuerySchema,
        success: ok200(paginatedBlogs),
      }),
      preHandler: [
        optionalAuthGuard,
        validateParams(blogTagParamSchema),
        validateQuery(blogListQuerySchema),
      ],
    },
    controller.byTag.bind(controller),
  );

  app.put(
    "/:id",
    {
      ...docRoute({
        tags: ["Blog"],
        summary: "Update a blog post",
        description: `
Update an owned blog post. At least one field required.

**Auth:** Bearer — must be the author (or admin path via Admin module for delete).

**Errors:** \`BLOG_NOT_FOUND\`, \`BLOG_FORBIDDEN\`, \`BLOG_SLUG_EXISTS\`.
        `.trim(),
        auth: "bearer",
        params: blogIdParamSchema,
        body: updateBlogSchema,
        success: ok200(BlogDtoSchema),
        errors: [403, 404, 409],
      }),
      preHandler: [
        authGuard,
        validateParams(blogIdParamSchema),
        validateBody(updateBlogSchema),
      ],
    },
    controller.update.bind(controller),
  );

  app.delete(
    "/:id",
    {
      ...docRoute({
        tags: ["Blog"],
        summary: "Delete a blog post",
        description: `
Soft/hard delete of an owned post.

**Auth:** Bearer — author only.
        `.trim(),
        auth: "bearer",
        params: blogIdParamSchema,
        success: ok200(OkSchema, { ok: true }),
        errors: [403, 404],
      }),
      preHandler: [authGuard, validateParams(blogIdParamSchema)],
    },
    controller.remove.bind(controller),
  );

  app.get(
    "/:slug",
    {
      ...docRoute({
        tags: ["Blog"],
        summary: "Get blog post by slug",
        description: `
Fetch a single post by slug.

**Auth:** Optional Bearer. Drafts are only visible to the owner.

**Errors:** \`BLOG_NOT_FOUND\`.
        `.trim(),
        auth: "optional",
        params: blogSlugParamSchema,
        success: ok200(BlogDtoSchema),
        errors: [404],
      }),
      preHandler: [optionalAuthGuard, validateParams(blogSlugParamSchema)],
    },
    controller.bySlug.bind(controller),
  );
}
