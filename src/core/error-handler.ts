import { FastifyInstance, FastifyError } from "fastify";
import { ZodError } from "zod";
import { AppError } from "@/utils/app-error";

function isZodError(error: unknown): error is ZodError {
  return (
    error instanceof ZodError ||
    (typeof error === "object" &&
      error !== null &&
      (error as { name?: string }).name === "ZodError" &&
      Array.isArray((error as { issues?: unknown }).issues))
  );
}

/** Duck-type AppError (instanceof can fail under ts-node path aliases / multi-load). */
function isAppError(error: unknown): error is AppError {
  if (error instanceof AppError) return true;
  if (typeof error !== "object" || error === null) return false;
  const e = error as Record<string, unknown>;
  return (
    typeof e.statusCode === "number" &&
    typeof e.code === "string" &&
    typeof e.type === "string" &&
    typeof e.message === "string" &&
    e.name !== "FastifyError"
  );
}

function isFastifyError(error: unknown): error is FastifyError {
  if (isAppError(error)) return false;
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode?: unknown }).statusCode === "number" &&
    ((error as { name?: string }).name === "FastifyError" ||
      (error as { code?: string }).code === "FST_ERR_VALIDATION")
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export function setupErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: unknown, request, reply) => {
    if (isZodError(error)) {
      const issues = (error as ZodError).issues ?? [];
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

      const statusCode =
        error.statusCode && error.statusCode >= 400 && error.statusCode < 600
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
        message:
          process.env.NODE_ENV === "production"
            ? "Something went wrong"
            : getErrorMessage(error),
      },
    });
  });
}
