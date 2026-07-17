import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { FastifyInstance } from "fastify";
import { config } from "@/config";
import { OpenApiTags } from "./common-schemas";

/**
 * Production OpenAPI / Swagger UI.
 *
 * Important: this project validates requests with Zod preHandlers, not Fastify AJV.
 * We register passthrough validator/serializer compilers so attaching OpenAPI `schema`
 * for documentation does NOT change runtime validation or response shapes.
 */
async function swaggerPlugin(app: FastifyInstance) {
  // Documentation-only: prevent Fastify AJV from re-validating bodies/params/query
  // and from stripping response fields via response schemas.
  app.setValidatorCompiler(() => {
    return (data: unknown) => ({ value: data });
  });
  app.setSerializerCompiler(() => {
    return (data: unknown) => JSON.stringify(data);
  });

  const port = config.app.port;
  const apiBase = `${config.app.api.prefix}/${config.app.api.version}`;

  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "Adulting101 API",
        version: "1.0.0",
        description: [
          "# Adulting101 Backend API",
          "",
          "Production HTTP API for the Adulting101 platform — anonymous-first community for life skills, wellness, journaling, letters, and therapy resources.",
          "",
          "## Response envelope",
          "",
          "All JSON endpoints use a consistent envelope:",
          "",
          "```json",
          '{ "success": true, "data": { ... }, "error": null }',
          "```",
          "",
          "Errors:",
          "",
          "```json",
          '{ "success": false, "data": null, "error": { "type": "ERROR_CODE", "message": "..." } }',
          "```",
          "",
          "Validation errors include `error.details[]` with `{ field, message }`.",
          "",
          "## Authentication",
          "",
          "1. `POST /api/v1/auth/login` or `/register` to obtain tokens.",
          "2. Click **Authorize** and paste the access token (Swagger adds `Bearer` automatically).",
          "3. Call protected endpoints.",
          "4. Rotate refresh tokens via `POST /api/v1/auth/refresh` — clients **must** store the new refresh token.",
          "",
          "Identity is **username-only** (no email). Recovery uses a recovery passphrase.",
          "",
          "## Roles",
          "",
          "| Mode | Requirement |",
          "|------|-------------|",
          "| Public | No token |",
          "| Authenticated | Valid JWT access token |",
          "| Optional auth | Token optional; may enrich response |",
          "| Admin | Role `admin` or permission `admin.access` |",
          "",
          "## Pagination",
          "",
          "List endpoints return:",
          "",
          "```json",
          '{ "items": [], "meta": { "total": 0, "page": 1, "limit": 20, "totalPages": 1 } }',
          "```",
          "",
          "Query params: `page` (default 1), `limit` (default 20, max 100).",
          "",
          "## Privacy guarantees",
          "",
          "- **Journals** are owner-only (even admins cannot read content).",
          "- **Chat messages** are participant-only.",
          "- **Private letters** are not listed for admin moderation.",
          "",
          "## Realtime",
          "",
          "Chat delivery uses Socket.IO (not documented in this OpenAPI surface). See project `CHAT_SOCKET_EVENTS` docs.",
        ].join("\n"),
        contact: {
          name: "Adulting101 API Team",
          email: "api@adulting101.app",
          url: "https://adulting101.app",
        },
        license: {
          name: "Proprietary",
          url: "https://adulting101.app/terms",
        },
      },
      servers: [
        {
          url: "https://backend-erd4.onrender.com/",
          description: "Production",
        },
        {
          url: `http://localhost:${port}`,
          description: "Development",
        },
      ],
      tags: OpenApiTags.map((t) => ({ name: t.name, description: t.description })),
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description:
              "JWT access token from `/api/v1/auth/login` or `/api/v1/auth/register`. " +
              "Enter the raw token only — Swagger UI prefixes `Bearer` automatically.",
          },
        },
      },
      // Global default: no security (public). Protected routes override with bearerAuth.
      security: [],
    },
    // Ensure encapsulated module routes are still included
    refResolver: {
      buildLocalReference(json, baseUri, fragment, i) {
        if (typeof json.$id === "string") return json.$id;
        return `def-${i}`;
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    logo: undefined,
  });

  // Explicit OpenAPI JSON (also available via @fastify/swagger at /docs/json by default)
  app.get(
    "/openapi.json",
    {
      schema: {
        hide: true,
      },
    },
    async () => app.swagger(),
  );

  app.log.info(
    {
      swaggerUi: "/docs",
      openapiJson: "/docs/json",
      openapiAlias: "/openapi.json",
      apiBase,
    },
    "Swagger/OpenAPI documentation enabled",
  );
}

export default fp(swaggerPlugin, {
  name: "swagger",
});
