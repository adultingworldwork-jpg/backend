"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupErrorHandler = setupErrorHandler;
const zod_1 = require("zod");
const app_error_1 = require("../utils/app-error");
function isZodError(error) {
    return (error instanceof zod_1.ZodError ||
        (typeof error === "object" &&
            error !== null &&
            error.name === "ZodError" &&
            Array.isArray(error.issues)));
}
/** Duck-type AppError (instanceof can fail under ts-node path aliases / multi-load). */
function isAppError(error) {
    if (error instanceof app_error_1.AppError)
        return true;
    if (typeof error !== "object" || error === null)
        return false;
    const e = error;
    return (typeof e.statusCode === "number" &&
        typeof e.code === "string" &&
        typeof e.type === "string" &&
        typeof e.message === "string" &&
        e.name !== "FastifyError");
}
function isFastifyError(error) {
    if (isAppError(error))
        return false;
    return (typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode === "number" &&
        (error.name === "FastifyError" ||
            error.code === "FST_ERR_VALIDATION"));
}
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return "Something went wrong";
}
function setupErrorHandler(app) {
    app.setErrorHandler((error, request, reply) => {
        if (isZodError(error)) {
            const issues = error.issues ?? [];
            request.log.warn(error);
            return reply.status(400).send({
                success: false,
                data: null,
                error: {
                    type: "VALIDATION_ERROR",
                    details: issues.map((e) => ({
                        field: e.path.join("."),
                        message: e.message,
                    })),
                },
            });
        }
        if (isAppError(error)) {
            request.log.warn(error);
            return reply.status(error.statusCode).send({
                success: false,
                data: null,
                error: {
                    type: error.type || error.code,
                    message: error.message,
                },
            });
        }
        if (isFastifyError(error)) {
            request.log.warn(error);
            const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600
                ? error.statusCode
                : 500;
            return reply.status(statusCode).send({
                success: false,
                data: null,
                error: {
                    type: "HTTP_ERROR",
                    message: error.message,
                },
            });
        }
        request.log.error(error);
        return reply.status(500).send({
            success: false,
            data: null,
            error: {
                type: "INTERNAL_SERVER_ERROR",
                message: process.env.NODE_ENV === "production"
                    ? "Something went wrong"
                    : getErrorMessage(error),
            },
        });
    });
}
