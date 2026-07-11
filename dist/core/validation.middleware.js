"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
exports.validateParams = validateParams;
const zod_1 = require("zod");
function buildValidationError(result) {
    return new zod_1.z.ZodError(result.error.issues);
}
function validateRequestPart(schema, value) {
    const result = schema.safeParse(value);
    if (!result.success) {
        throw buildValidationError(result);
    }
    return result.data;
}
function validateBody(schema) {
    return async function (request) {
        request.body = validateRequestPart(schema, request.body);
    };
}
function validateQuery(schema) {
    return async function (request) {
        request.query = validateRequestPart(schema, request.query);
    };
}
function validateParams(schema) {
    return async function (request) {
        request.params = validateRequestPart(schema, request.params);
    };
}
