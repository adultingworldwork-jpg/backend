import { z, ZodType } from "zod";

/**
 * Convert a Zod schema to a clean OpenAPI/JSON Schema object.
 * Uses input shape so request transforms (e.g. tag normalization) stay documentable.
 * Zod remains the runtime validation source of truth (see swagger.plugin).
 */
export function zodToOpenApi(
  schema: ZodType,
  options?: {
    description?: string;
    example?: unknown;
  },
): Record<string, unknown> {
  const json = z.toJSONSchema(schema, {
    io: "input",
    unrepresentable: "any",
  }) as Record<string, unknown>;

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

function sanitizeSchema(node: unknown): void {
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;

  if (
    typeof obj.maximum === "number" &&
    obj.maximum >= Number.MAX_SAFE_INTEGER
  ) {
    delete obj.maximum;
  }
  if (
    typeof obj.minimum === "number" &&
    obj.minimum <= Number.MIN_SAFE_INTEGER
  ) {
    delete obj.minimum;
  }

  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      value.forEach(sanitizeSchema);
    } else if (value && typeof value === "object") {
      sanitizeSchema(value);
    }
  }
}
