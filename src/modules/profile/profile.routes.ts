import { FastifyInstance } from "fastify";
import { ProfileController } from "./profile.controller";
import { authGuard, optionalAuthGuard } from "@/core/auth.guard";
import { validateBody, validateParams } from "@/core/validation.middleware";
import {
  mediaRefSchema,
  updateProfileSchema,
  usernameParamSchema,
} from "./profile.schema";
import { ProfileDtoSchema, docRoute, ok200 } from "@/plugins/swagger";

export async function profileRoutes(app: FastifyInstance) {
  const controller = new ProfileController();

  app.get(
    "/me",
    {
      ...docRoute({
        tags: ["Profile"],
        summary: "Get my profile",
        description: `
Return the authenticated user's profile.

**Who should use it:** Logged-in clients rendering the profile editor or account screen.

**Business purpose:** Load owner profile including private preferences.

**Preconditions:** Valid Bearer token. Profile is created at registration.
        `.trim(),
        auth: "bearer",
        success: ok200(ProfileDtoSchema),
        errors: [404],
      }),
      preHandler: [authGuard],
    },
    controller.getMe.bind(controller),
  );

  app.put(
    "/me",
    {
      ...docRoute({
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
        body: updateProfileSchema,
        bodyExample: {
          displayName: "Moon Flower",
          bio: "Learning adulting one day at a time.",
          pronouns: "they/them",
          location: "Remote",
          website: "https://example.com",
          visibility: "COMMUNITY",
        },
        success: ok200(ProfileDtoSchema),
        errors: [400, 404],
      }),
      preHandler: [authGuard, validateBody(updateProfileSchema)],
    },
    controller.updateMe.bind(controller),
  );

  app.patch(
    "/avatar",
    {
      ...docRoute({
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
        body: mediaRefSchema,
        success: ok200(ProfileDtoSchema),
        errors: [400, 404],
        consumes: ["application/json", "multipart/form-data"],
      }),
      preHandler: [authGuard],
    },
    controller.updateAvatar.bind(controller),
  );

  app.patch(
    "/cover",
    {
      ...docRoute({
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
        body: mediaRefSchema,
        success: ok200(ProfileDtoSchema),
        errors: [400, 404],
        consumes: ["application/json", "multipart/form-data"],
      }),
      preHandler: [authGuard],
    },
    controller.updateCover.bind(controller),
  );

  app.get(
    "/:username",
    {
      ...docRoute({
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
        params: usernameParamSchema,
        success: ok200(ProfileDtoSchema),
        errors: [403, 404],
      }),
      preHandler: [optionalAuthGuard, validateParams(usernameParamSchema)],
    },
    controller.getByUsername.bind(controller),
  );
}
