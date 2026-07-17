import { ZodType } from "zod";
import { zodToOpenApi } from "./zod-json-schema";
import {
  commonErrorResponses,
  successEnvelope,
} from "./common-schemas";

export type AuthMode = "public" | "bearer" | "optional" | "admin";

export type DocRouteOptions = {
  tags: string[];
  summary: string;
  description: string;
  /** Authentication requirement documented for consumers and Swagger Authorize */
  auth: AuthMode;
  body?: ZodType | Record<string, unknown>;
  /** Realistic example payload for the request body (shown in Swagger UI) */
  bodyExample?: unknown;
  querystring?: ZodType | Record<string, unknown>;
  queryExample?: unknown;
  params?: ZodType | Record<string, unknown>;
  paramsExample?: unknown;
  /**
   * Map of HTTP status → data schema (wrapped in success envelope automatically)
   * or a full response schema object when `raw: true`.
   */
  success?: Record<
    number,
    {
      description?: string;
      data: Record<string, unknown>;
      example?: unknown;
      /** When true, `data` is used as the full response schema (no envelope wrap). */
      raw?: boolean;
    }
  >;
  /** Extra error status codes beyond the defaults (400/401/403/404/500). */
  errors?: number[];
  deprecated?: boolean;
  /** Hide from Swagger UI (internal/metrics/etc.) */
  hide?: boolean;
  consumes?: string[];
  /** Custom header parameters */
  headers?: Array<{
    name: string;
    description: string;
    required?: boolean;
    schema?: Record<string, unknown>;
    example?: string;
  }>;
};

function authDescription(auth: AuthMode): string {
  switch (auth) {
    case "public":
      return "**Auth:** Public — no Bearer token required.";
    case "bearer":
      return "**Auth:** Authenticated — `Authorization: Bearer <accessToken>` required.";
    case "optional":
      return "**Auth:** Optional Bearer — anonymous access allowed; authenticated users may receive additional fields (e.g. isOwner, myReaction).";
    case "admin":
      return "**Auth:** Admin only — Bearer token required with role `admin` or permission `admin.access`.";
    default:
      return "";
  }
}

function securityFor(auth: AuthMode): Array<Record<string, string[]>> | undefined {
  if (auth === "public") return [];
  if (auth === "optional") {
    // Empty array entry documents optional: Swagger UI still offers Authorize
    return [];
  }
  return [{ bearerAuth: [] }];
}

function toSchema(
  value: ZodType | Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!value) return undefined;
  if (typeof (value as ZodType).safeParse === "function") {
    return zodToOpenApi(value as ZodType);
  }
  return value as Record<string, unknown>;
}

/**
 * Build a Fastify route `schema` object for OpenAPI generation.
 * Does not replace Zod runtime validation (AJV is disabled in swagger plugin).
 */
export function docRoute(opts: DocRouteOptions): {
  schema: Record<string, unknown>;
} {
  const description = [
    authDescription(opts.auth),
    "",
    opts.description.trim(),
  ].join("\n");

  const response: Record<string, unknown> = {};

  if (opts.success) {
    for (const [code, def] of Object.entries(opts.success)) {
      response[code] = {
        description: def.description ?? `HTTP ${code}`,
        ...(def.raw
          ? { type: "object", ...(def.data as object) }
          : {
              ...successEnvelope(def.data, def.example),
            }),
      };
    }
  }

  // Always include core error responses for QA / consumers
  const errorCodes = new Set<number>([
    400,
    401,
    500,
    ...(opts.errors ?? []),
  ]);
  if (opts.auth === "bearer" || opts.auth === "admin") {
    errorCodes.add(401);
    errorCodes.add(403);
  }
  if (opts.auth === "admin") {
    errorCodes.add(403);
  }

  for (const code of errorCodes) {
    if (response[code]) continue;
    const key = code as keyof typeof commonErrorResponses;
    if (commonErrorResponses[key]) {
      response[code] = {
        description: (commonErrorResponses[key] as { description?: string })
          .description,
        ...commonErrorResponses[key],
      };
    }
  }

  // Admin-specific 403 example
  if (opts.auth === "admin" && response[403]) {
    response[403] = {
      ...commonErrorResponses[403],
      description: "Forbidden — admin role required",
      example: {
        success: false,
        data: null,
        error: {
          type: "ADMIN_REQUIRED",
          message: "Admin role required",
        },
      },
    };
  }

  const schema: Record<string, unknown> = {
    tags: opts.tags,
    summary: opts.summary,
    description,
    security: securityFor(opts.auth),
    response,
  };

  if (opts.deprecated) schema.deprecated = true;
  if (opts.hide) schema.hide = true;

  const body = toSchema(opts.body);
  if (body) {
    if (opts.bodyExample !== undefined) {
      body.example = opts.bodyExample;
    }
    schema.body = body;
  }

  const querystring = toSchema(opts.querystring);
  if (querystring) {
    if (opts.queryExample !== undefined) {
      querystring.example = opts.queryExample;
    }
    schema.querystring = querystring;
  }

  const params = toSchema(opts.params);
  if (params) {
    if (opts.paramsExample !== undefined) {
      params.example = opts.paramsExample;
    }
    schema.params = params;
  }

  if (opts.consumes?.length) {
    schema.consumes = opts.consumes;
  }

  if (opts.headers?.length) {
    schema.headers = {
      type: "object",
      properties: Object.fromEntries(
        opts.headers.map((h) => [
          h.name,
          {
            type: "string",
            description: h.description,
            example: h.example,
            ...(h.schema ?? {}),
          },
        ]),
      ),
      required: opts.headers.filter((h) => h.required).map((h) => h.name),
    };
  }

  // Document optional Bearer in description; for optional routes still allow Authorize button via global scheme
  if (opts.auth === "optional") {
    schema.security = [];
  }

  return { schema };
}

/** Shortcut: success 200 with data schema */
export function ok200(
  data: Record<string, unknown>,
  example?: unknown,
  description = "Success",
) {
  return {
    200: { description, data, example },
  };
}

export function created201(
  data: Record<string, unknown>,
  example?: unknown,
  description = "Created",
) {
  return {
    201: { description, data, example },
  };
}
