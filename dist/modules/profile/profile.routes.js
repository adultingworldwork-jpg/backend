"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileRoutes = profileRoutes;
const profile_controller_1 = require("./profile.controller");
const auth_guard_1 = require("../../core/auth.guard");
const validation_middleware_1 = require("../../core/validation.middleware");
const profile_schema_1 = require("./profile.schema");
const swagger_1 = require("../../plugins/swagger");
async function profileRoutes(app) {
    const controller = new profile_controller_1.ProfileController();
    app.get("/me", {
        ...(0, swagger_1.docRoute)({
            tags: ["Profile"],
            summary: "Get my profile",
            description: `
Return the authenticated user's profile.

**Who should use it:** Logged-in clients rendering the profile editor or account screen.

**Business purpose:** Load owner profile including private preferences.

**Preconditions:** Valid Bearer token. Profile is created at registration.
        `.trim(),
            auth: "bearer",
            success: (0, swagger_1.ok200)(swagger_1.ProfileDtoSchema),
            errors: [404],
        }),
        preHandler: [auth_guard_1.authGuard],
    }, controller.getMe.bind(controller));
    app.put("/me", {
        ...(0, swagger_1.docRoute)({
            tags: ["Profile"],
            summary: "Update my profile",
            description: `
Update profile fields for the authenticated user.

**Who should use it:** Profile settings UI.

**Business purpose:** Edit presentation fields (display name, bio, visibility, etc.). Does not change username/password (see Authentication).

**Validation highlights:**
- \`displayName\`: 1–30 chars
- \`bio\`: max 1000
- \`website\`: empty string or valid URL (max 200)
- \`dateOfBirth\`: null, ISO datetime, or \`YYYY-MM-DD\`
- \`visibility\`: PUBLIC | COMMUNITY | PRIVATE
- \`preferences\`: free-form object

**Postconditions:** Profile updated; audit log written.
        `.trim(),
            auth: "bearer",
            body: profile_schema_1.updateProfileSchema,
            bodyExample: {
                displayName: "Moon Flower",
                bio: "Learning adulting one day at a time.",
                pronouns: "they/them",
                location: "Remote",
                website: "https://example.com",
                visibility: "COMMUNITY",
            },
            success: (0, swagger_1.ok200)(swagger_1.ProfileDtoSchema),
            errors: [400, 404],
        }),
        preHandler: [auth_guard_1.authGuard, (0, validation_middleware_1.validateBody)(profile_schema_1.updateProfileSchema)],
    }, controller.updateMe.bind(controller));
    app.patch("/avatar", {
        ...(0, swagger_1.docRoute)({
            tags: ["Profile"],
            summary: "Update profile avatar",
            description: `
Set the profile avatar image.

**Supported content types:**
1. **JSON** \`application/json\` — body \`{ "url": "https://..." }\` or \`{ "uploadId": "<uploadId>" }\`
2. **Multipart** \`multipart/form-data\` — field \`file\` (image)

**Who should use it:** Profile photo editor.

**Business purpose:** Attach avatar via existing upload id/URL or direct file upload (max ~5MB images).

**Side effects:** May create an Upload record when multipart is used; profile.avatar updated.
        `.trim(),
            auth: "bearer",
            body: profile_schema_1.mediaRefSchema,
            success: (0, swagger_1.ok200)(swagger_1.ProfileDtoSchema),
            errors: [400, 404],
            consumes: ["application/json", "multipart/form-data"],
        }),
        preHandler: [auth_guard_1.authGuard],
    }, controller.updateAvatar.bind(controller));
    app.patch("/cover", {
        ...(0, swagger_1.docRoute)({
            tags: ["Profile"],
            summary: "Update profile cover image",
            description: `
Set the profile cover image.

Same dual contract as avatar:
- JSON: \`url\` or \`uploadId\`
- Multipart: file field

**Side effects:** Profile.coverImage updated.
        `.trim(),
            auth: "bearer",
            body: profile_schema_1.mediaRefSchema,
            success: (0, swagger_1.ok200)(swagger_1.ProfileDtoSchema),
            errors: [400, 404],
            consumes: ["application/json", "multipart/form-data"],
        }),
        preHandler: [auth_guard_1.authGuard],
    }, controller.updateCover.bind(controller));
    app.get("/:username", {
        ...(0, swagger_1.docRoute)({
            tags: ["Profile"],
            summary: "Get profile by username",
            description: `
Public (visibility-gated) profile lookup by auth username.

**Who should use it:** Public profile pages.

**Business purpose:** Resolve a username to a profile when visibility allows.

**Auth:** Optional Bearer — owners always see their own profile; others subject to PUBLIC/COMMUNITY/PRIVATE rules.

**Errors:** \`PROFILE_NOT_FOUND\` or \`PROFILE_FORBIDDEN\` when not visible.
        `.trim(),
            auth: "optional",
            params: profile_schema_1.usernameParamSchema,
            success: (0, swagger_1.ok200)(swagger_1.ProfileDtoSchema),
            errors: [403, 404],
        }),
        preHandler: [auth_guard_1.optionalAuthGuard, (0, validation_middleware_1.validateParams)(profile_schema_1.usernameParamSchema)],
    }, controller.getByUsername.bind(controller));
}
