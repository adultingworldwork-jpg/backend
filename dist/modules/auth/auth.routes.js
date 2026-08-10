"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const auth_controller_1 = require("./auth.controller");
const auth_guard_1 = require("../../core/auth.guard");
const validation_middleware_1 = require("../../core/validation.middleware");
const auth_schema_1 = require("./auth.schema");
const swagger_1 = require("../../plugins/swagger");
async function authRoutes(app) {
    const controller = new auth_controller_1.AuthController();
    app.post("/register", {
        ...(0, swagger_1.docRoute)({
            tags: ["Authentication"],
            summary: "Register a new account",
            description: `
Create a new anonymous-first account with a username and recovery passphrase (no email).

**Who should use it:** New users joining the platform.

**Business purpose:** Establish identity and immediately issue JWT access + refresh tokens. A default COMMUNITY profile is created for the user.

**Preconditions:**
- Username must be unique (case-insensitive)
- \`acceptedTerms\` must be literal \`true\` (Community Agreement)
- Username: 2–30 characters; letters, numbers, spaces, \`_\` \`.\` \`-\`
- Password: 8–60 characters
- Recovery passphrase: 1–40 characters (store securely — used for password recovery)

**Postconditions:**
- User record created with role \`user\`
- Default profile created
- Access + refresh tokens returned

**Side effects:** Security audit log entry; default profile creation.
        `.trim(),
            auth: "public",
            body: auth_schema_1.registerSchema,
            bodyExample: {
                username: "MoonFlower",
                password: "SecurePass123!",
                recoveryPassphrase: "purple-ocean-lantern",
                acceptedTerms: true,
            },
            success: (0, swagger_1.created201)(swagger_1.AuthResultSchema, {
                user: {
                    id: "665f1a2b3c4d5e6f7a8b9c0d",
                    username: "MoonFlower",
                    usernameSlug: "moonflower",
                    role: "user",
                    permissions: [],
                    createdAt: "2026-07-11T12:00:00.000Z",
                },
                tokens: {
                    accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                },
            }),
            errors: [409],
        }),
        preHandler: [(0, validation_middleware_1.validateBody)(auth_schema_1.registerSchema)],
    }, controller.register.bind(controller));
    app.post("/login", {
        ...(0, swagger_1.docRoute)({
            tags: ["Authentication"],
            summary: "Login with username and password",
            description: `
Authenticate with username (case-insensitive) and password.

**Who should use it:** Returning users and clients re-establishing a session.

**Business purpose:** Issue a new access + refresh token pair.

**Important notes:**
- Failed attempts increment a counter; after the lockout threshold the account returns \`ACCOUNT_LOCKED\` (423).
- Suspended/locked admin statuses prevent login.

**Postconditions:** Tokens issued; failed-login counter cleared on success.
        `.trim(),
            auth: "public",
            body: auth_schema_1.loginSchema,
            bodyExample: {
                username: "MoonFlower",
                password: "SecurePass123!",
            },
            success: (0, swagger_1.ok200)(swagger_1.AuthResultSchema),
            errors: [401, 423],
        }),
        preHandler: [(0, validation_middleware_1.validateBody)(auth_schema_1.loginSchema)],
    }, controller.login.bind(controller));
    app.post("/recover", {
        ...(0, swagger_1.docRoute)({
            tags: ["Authentication"],
            summary: "Recover account password",
            description: `
Reset password using the recovery passphrase (no email/OTP).

**Who should use it:** Users who forgot their password but still know username + recovery passphrase.

**Business purpose:** Password reset without email dependency (anonymous-first product).

**Important notes:**
- Invalid username or passphrase both return \`INVALID_RECOVERY\` (anti-enumeration).
- Password change **invalidates all refresh tokens** — user must log in again.

**Side effects:** All sessions revoked; password hash updated.
        `.trim(),
            auth: "public",
            body: auth_schema_1.recoverSchema,
            bodyExample: {
                username: "MoonFlower",
                recoveryPassphrase: "purple-ocean-lantern",
                newPassword: "NewSecurePass456!",
            },
            success: (0, swagger_1.ok200)(swagger_1.OkSchema, { ok: true }),
            errors: [400],
        }),
        preHandler: [(0, validation_middleware_1.validateBody)(auth_schema_1.recoverSchema)],
    }, controller.recover.bind(controller));
    app.post("/refresh", {
        ...(0, swagger_1.docRoute)({
            tags: ["Authentication"],
            summary: "Rotate refresh token",
            description: `
Exchange a valid refresh token for a new access + refresh pair (rotation).

**Who should use it:** Clients when the access token expires.

**Business purpose:** Short-lived access tokens with long-lived refresh rotation and reuse detection.

**Important notes:**
- Clients **must** replace the stored refresh token after every successful refresh.
- Presenting a previously rotated refresh token triggers \`REFRESH_TOKEN_REUSE\` and revokes the token family.

**Auth:** Public (token is in the body, not Authorization header).
        `.trim(),
            auth: "public",
            body: auth_schema_1.refreshSchema,
            bodyExample: {
                refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2NWYxYTJiIiwidHlwZSI6InJlZnJlc2gifQ.signature",
            },
            success: (0, swagger_1.ok200)({
                type: "object",
                properties: { tokens: swagger_1.AuthTokensSchema },
                required: ["tokens"],
            }, {
                tokens: {
                    accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                },
            }),
            errors: [401],
        }),
        preHandler: [(0, validation_middleware_1.validateBody)(auth_schema_1.refreshSchema)],
    }, controller.refresh.bind(controller));
    app.get("/me", {
        ...(0, swagger_1.docRoute)({
            tags: ["Authentication"],
            summary: "Get current authenticated user",
            description: `
Return the authenticated user identity from the access token.

**Who should use it:** Any client that needs to hydrate session state.

**Business purpose:** Session introspection without re-login.

**Preconditions:** Valid Bearer access token.
        `.trim(),
            auth: "bearer",
            success: (0, swagger_1.ok200)(swagger_1.AuthenticatedUserSchema),
        }),
        preHandler: [auth_guard_1.authGuard],
    }, controller.me.bind(controller));
    app.post("/logout", {
        ...(0, swagger_1.docRoute)({
            tags: ["Authentication"],
            summary: "Logout and revoke refresh tokens",
            description: `
Clear server-side refresh token hashes for the user.

**Who should use it:** Clients ending a session.

**Auth:** Optional Bearer. Body may include \`refreshToken\` for body-only revoke.

**Side effects:** Refresh tokens for the user are cleared (cannot refresh until login again).
        `.trim(),
            auth: "optional",
            body: auth_schema_1.logoutSchema,
            bodyExample: {
                refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2NWYxYTJiIiwidHlwZSI6InJlZnJlc2gifQ.signature",
            },
            success: (0, swagger_1.ok200)(swagger_1.OkSchema, { ok: true }),
        }),
        preHandler: [
            async (request, reply) => {
                const header = request.headers.authorization;
                if (header) {
                    await (0, auth_guard_1.authGuard)(request, reply);
                }
            },
        ],
    }, async (request, reply) => {
        if (request.body && typeof request.body === "object") {
            const parsed = auth_schema_1.logoutSchema.safeParse(request.body);
            if (!parsed.success) {
                throw parsed.error;
            }
            request.body = parsed.data;
        }
        else {
            request.body = {};
        }
        return controller.logout(request, reply);
    });
}
