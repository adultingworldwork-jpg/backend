"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRoutes = uploadRoutes;
const upload_controller_1 = require("./upload.controller");
const auth_guard_1 = require("../../core/auth.guard");
const swagger_1 = require("../../plugins/swagger");
const multipartUploadBody = {
    type: "object",
    description: "multipart/form-data upload. Send a single file field plus optional purpose.",
    required: ["file"],
    properties: {
        file: {
            type: "string",
            format: "binary",
            description: "File bytes. Allowed MIME: image/jpeg, image/png, image/webp, image/gif, application/pdf.",
        },
        purpose: {
            type: "string",
            enum: [
                "blog_cover",
                "book_cover",
                "book_pdf",
                "avatar",
                "cover",
                "general",
            ],
            default: "general",
            description: "Upload purpose controls size limits (images 5MB, book_pdf 10MB) and storage folder.",
            example: "avatar",
        },
    },
};
async function uploadRoutes(app) {
    const controller = new upload_controller_1.UploadController();
    app.post("/", {
        ...(0, swagger_1.docRoute)({
            tags: ["Files"],
            summary: "Upload a file",
            description: `
Upload a single file via **multipart/form-data**.

**Who should use it:** Clients attaching media to blogs, profiles, journals, letters, community posts, chat.

**Business purpose:** Persist file metadata and CDN URL (Cloudinary when configured) and return an upload id for later referencing.

**Constraints:**
- Single file per request
- MIME: \`image/jpeg\`, \`image/png\`, \`image/webp\`, \`image/gif\`, \`application/pdf\`
- Max size: 5MB (images/general), 10MB (\`book_pdf\`)
- Global multipart limit: 10MB

**Postconditions:** Upload document created; owned by the authenticated user.

**Errors:** \`UPLOAD_TOO_LARGE\`, \`UPLOAD_INVALID_TYPE\`, \`VALIDATION_ERROR\` (no file).
        `.trim(),
            auth: "bearer",
            body: multipartUploadBody,
            consumes: ["multipart/form-data"],
            success: (0, swagger_1.created201)(swagger_1.UploadDtoSchema),
            errors: [400],
        }),
        preHandler: [auth_guard_1.authGuard],
    }, controller.upload.bind(controller));
    app.delete("/:id", {
        ...(0, swagger_1.docRoute)({
            tags: ["Files"],
            summary: "Delete an upload",
            description: `
Delete an upload by id.

**Who should use it:** Owners cleaning up unused media; admins can delete any.

**Business purpose:** Remove storage object (when storage plugin is available) and the upload record.

**Preconditions:** Authenticated; caller must own the upload (or be admin).

**Errors:** \`UPLOAD_NOT_FOUND\`, \`FORBIDDEN\`.
        `.trim(),
            auth: "bearer",
            params: {
                type: "object",
                required: ["id"],
                properties: {
                    id: {
                        type: "string",
                        description: "Upload document id",
                        example: "665f1a2b3c4d5e6f7a8b9c19",
                    },
                },
            },
            success: (0, swagger_1.ok200)(swagger_1.OkSchema, { ok: true }),
            errors: [403, 404],
        }),
        preHandler: [auth_guard_1.authGuard],
    }, controller.remove.bind(controller));
}
