import { FastifyInstance } from "fastify";
import { ResourcesController } from "./resources.controller";
import { authGuard, optionalAuthGuard } from "@/core/auth.guard";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/core/validation.middleware";
import {
  createResourceSchema,
  resourceCategoryParamSchema,
  resourceIdParamSchema,
  resourceListQuerySchema,
  resourceSlugParamSchema,
  resourceTagParamSchema,
  updateResourceSchema,
} from "./resources.schema";
import {
  OkSchema,
  ResourceDtoSchema,
  created201,
  docRoute,
  ok200,
  paginatedSchema,
} from "@/plugins/swagger";

const paginatedResources = paginatedSchema(ResourceDtoSchema);

export async function resourcesRoutes(app: FastifyInstance) {
  const c = new ResourcesController();

  app.post(
    "/",
    {
      ...docRoute({
        tags: ["Resources"],
        summary: "Create a therapy resource",
        description: `
Create a curated wellness/therapy resource (content library — not booking).

**Body:** title, content, category, optional summary/tags/cover/featured/status.

**Defaults:** status DRAFT, estimatedReadMinutes 5, featured false.
        `.trim(),
        auth: "bearer",
        body: createResourceSchema,
        bodyExample: {
          title: "Grounding techniques for anxiety",
          summary: "Quick exercises you can use anywhere.",
          content: "Step 1: Name five things you can see…",
          category: "anxiety",
          tags: ["grounding", "anxiety"],
          estimatedReadMinutes: 5,
          featured: false,
          status: "DRAFT",
        },
        success: created201(ResourceDtoSchema),
        errors: [400, 409],
      }),
      preHandler: [authGuard, validateBody(createResourceSchema)],
    },
    c.create.bind(c),
  );

  app.get(
    "/",
    {
      ...docRoute({
        tags: ["Resources"],
        summary: "List published resources",
        description: `
Paginated published resource library.

**Auth:** Optional Bearer.
        `.trim(),
        auth: "optional",
        querystring: resourceListQuerySchema,
        success: ok200(paginatedResources),
      }),
      preHandler: [optionalAuthGuard, validateQuery(resourceListQuerySchema)],
    },
    c.list.bind(c),
  );

  app.get(
    "/featured",
    {
      ...docRoute({
        tags: ["Resources"],
        summary: "List featured published resources",
        description: `Paginated list of featured published resources.`,
        auth: "optional",
        querystring: resourceListQuerySchema,
        success: ok200(paginatedResources),
      }),
      preHandler: [optionalAuthGuard, validateQuery(resourceListQuerySchema)],
    },
    c.featured.bind(c),
  );

  app.get(
    "/me",
    {
      ...docRoute({
        tags: ["Resources"],
        summary: "List my resources",
        description: `List draft + published resources owned by the authenticated author.`,
        auth: "bearer",
        querystring: resourceListQuerySchema,
        success: ok200(paginatedResources),
      }),
      preHandler: [authGuard, validateQuery(resourceListQuerySchema)],
    },
    c.mine.bind(c),
  );

  app.get(
    "/category/:category",
    {
      ...docRoute({
        tags: ["Resources"],
        summary: "List published resources by category",
        description: `Filter published resources by category path param.`,
        auth: "optional",
        params: resourceCategoryParamSchema,
        querystring: resourceListQuerySchema,
        success: ok200(paginatedResources),
      }),
      preHandler: [
        optionalAuthGuard,
        validateParams(resourceCategoryParamSchema),
        validateQuery(resourceListQuerySchema),
      ],
    },
    c.byCategory.bind(c),
  );

  app.get(
    "/tag/:tag",
    {
      ...docRoute({
        tags: ["Resources"],
        summary: "List published resources by tag",
        description: `Filter published resources by tag path param.`,
        auth: "optional",
        params: resourceTagParamSchema,
        querystring: resourceListQuerySchema,
        success: ok200(paginatedResources),
      }),
      preHandler: [
        optionalAuthGuard,
        validateParams(resourceTagParamSchema),
        validateQuery(resourceListQuerySchema),
      ],
    },
    c.byTag.bind(c),
  );

  app.post(
    "/:id/publish",
    {
      ...docRoute({
        tags: ["Resources"],
        summary: "Publish a resource",
        description: `
Set resource status to PUBLISHED and stamp \`publishedAt\`.

**Auth:** Bearer — must be the author.
        `.trim(),
        auth: "bearer",
        params: resourceIdParamSchema,
        success: ok200(ResourceDtoSchema),
        errors: [403, 404],
      }),
      preHandler: [authGuard, validateParams(resourceIdParamSchema)],
    },
    c.publish.bind(c),
  );

  app.put(
    "/:id",
    {
      ...docRoute({
        tags: ["Resources"],
        summary: "Update a resource",
        description: `Update owned resource fields. At least one field required.`,
        auth: "bearer",
        params: resourceIdParamSchema,
        body: updateResourceSchema,
        success: ok200(ResourceDtoSchema),
        errors: [403, 404, 409],
      }),
      preHandler: [
        authGuard,
        validateParams(resourceIdParamSchema),
        validateBody(updateResourceSchema),
      ],
    },
    c.update.bind(c),
  );

  app.delete(
    "/:id",
    {
      ...docRoute({
        tags: ["Resources"],
        summary: "Delete a resource",
        description: `Delete an owned resource.`,
        auth: "bearer",
        params: resourceIdParamSchema,
        success: ok200(OkSchema, { ok: true }),
        errors: [403, 404],
      }),
      preHandler: [authGuard, validateParams(resourceIdParamSchema)],
    },
    c.remove.bind(c),
  );

  app.get(
    "/:slug",
    {
      ...docRoute({
        tags: ["Resources"],
        summary: "Get resource by slug",
        description: `
Fetch a single resource by slug.

**Auth:** Optional Bearer. Drafts visible to owner only.
        `.trim(),
        auth: "optional",
        params: resourceSlugParamSchema,
        success: ok200(ResourceDtoSchema),
        errors: [404],
      }),
      preHandler: [optionalAuthGuard, validateParams(resourceSlugParamSchema)],
    },
    c.bySlug.bind(c),
  );
}
