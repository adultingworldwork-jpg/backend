"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.docRoute = docRoute;
exports.ok200 = ok200;
exports.created201 = created201;
const zod_json_schema_1 = require("./zod-json-schema");
const common_schemas_1 = require("./common-schemas");
function authDescription(auth) {
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
function securityFor(auth) {
    if (auth === "public")
        return [];
    if (auth === "optional") {
        // Empty array entry documents optional: Swagger UI still offers Authorize
        return [];
    }
    return [{ bearerAuth: [] }];
}
function toSchema(value) {
    if (!value)
        return undefined;
    if (typeof value.safeParse === "function") {
        return (0, zod_json_schema_1.zodToOpenApi)(value);
    }
    return value;
}
/**
 * Build a Fastify route `schema` object for OpenAPI generation.
 * Does not replace Zod runtime validation (AJV is disabled in swagger plugin).
 */
function docRoute(opts) {
    const description = [
        authDescription(opts.auth),
        "",
        opts.description.trim(),
    ].join("\n");
    const response = {};
    if (opts.success) {
        for (const [code, def] of Object.entries(opts.success)) {
            response[code] = {
                description: def.description ?? `HTTP ${code}`,
                ...(def.raw
                    ? { type: "object", ...def.data }
                    : {
                        ...(0, common_schemas_1.successEnvelope)(def.data, def.example),
                    }),
            };
        }
    }
    // Always include core error responses for QA / consumers
    const errorCodes = new Set([
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
        if (response[code])
            continue;
        const key = code;
        if (common_schemas_1.commonErrorResponses[key]) {
            response[code] = {
                description: common_schemas_1.commonErrorResponses[key]
                    .description,
                ...common_schemas_1.commonErrorResponses[key],
            };
        }
    }
    // Admin-specific 403 example
    if (opts.auth === "admin" && response[403]) {
        response[403] = {
            ...common_schemas_1.commonErrorResponses[403],
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
    const schema = {
        tags: opts.tags,
        summary: opts.summary,
        description,
        security: securityFor(opts.auth),
        response,
    };
    if (opts.deprecated)
        schema.deprecated = true;
    if (opts.hide)
        schema.hide = true;
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
            properties: Object.fromEntries(opts.headers.map((h) => [
                h.name,
                {
                    type: "string",
                    description: h.description,
                    example: h.example,
                    ...(h.schema ?? {}),
                },
            ])),
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
function ok200(data, example, description = "Success") {
    return {
        200: { description, data, example },
    };
}
function created201(data, example, description = "Created") {
    return {
        201: { description, data, example },
    };
}
