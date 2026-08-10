"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zodToOpenApi = zodToOpenApi;
const zod_1 = require("zod");
/**
 * Convert a Zod schema to a clean OpenAPI/JSON Schema object.
 * Uses input shape so request transforms (e.g. tag normalization) stay documentable.
 * Zod remains the runtime validation source of truth (see swagger.plugin).
 */
function zodToOpenApi(schema, options) {
    const json = zod_1.z.toJSONSchema(schema, {
        io: "input",
        unrepresentable: "any",
    });
    // Strip draft meta fields that confuse OpenAPI tooling
    delete json.$schema;
    delete json.$id;
    // Soften JS integer max noise from coerce.number()
    sanitizeSchema(json);
    if (options?.description) {
        json.description = options.description;
    }
    if (options?.example !== undefined) {
        json.example = options.example;
    }
    return json;
}
function sanitizeSchema(node) {
    if (!node || typeof node !== "object")
        return;
    const obj = node;
    if (typeof obj.maximum === "number" &&
        obj.maximum >= Number.MAX_SAFE_INTEGER) {
        delete obj.maximum;
    }
    if (typeof obj.minimum === "number" &&
        obj.minimum <= Number.MIN_SAFE_INTEGER) {
        delete obj.minimum;
    }
    for (const value of Object.values(obj)) {
        if (Array.isArray(value)) {
            value.forEach(sanitizeSchema);
        }
        else if (value && typeof value === "object") {
            sanitizeSchema(value);
        }
    }
}
