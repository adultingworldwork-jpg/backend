import { FastifyInstance } from "fastify";
import { AuthController } from "./auth.controller";
import { authGuard } from "@/core/auth.guard";
import { validateBody } from "@/core/validation.middleware";
import {
  loginSchema,
  logoutSchema,
  recoverSchema,
  refreshSchema,
  registerSchema,
} from "./auth.schema";
import {
  AuthResultSchema,
  AuthTokensSchema,
  AuthenticatedUserSchema,
  OkSchema,
  created201,
  docRoute,
  ok200,
} from "@/plugins/swagger";

export async function authRoutes(app: FastifyInstance) {
  const controller = new AuthController();

  app.post(
    "/register",
    {
      ...docRoute({
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
        body: registerSchema,
        bodyExample: {
          username: "MoonFlower",
          password: "SecurePass123!",
          recoveryPassphrase: "purple-ocean-lantern",
          acceptedTerms: true,
        },
        success: created201(AuthResultSchema, {
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
      preHandler: [validateBody(registerSchema)],
    },
    controller.register.bind(controller),
  );

  app.post(
    "/login",
    {
      ...docRoute({
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
        body: loginSchema,
        bodyExample: {
          username: "MoonFlower",
          password: "SecurePass123!",
        },
        success: ok200(AuthResultSchema),
        errors: [401, 423],
      }),
      preHandler: [validateBody(loginSchema)],
    },
    controller.login.bind(controller),
  );

  app.post(
    "/recover",
    {
      ...docRoute({
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
        body: recoverSchema,
        bodyExample: {
          username: "MoonFlower",
          recoveryPassphrase: "purple-ocean-lantern",
          newPassword: "NewSecurePass456!",
        },
        success: ok200(OkSchema, { ok: true }),
        errors: [400],
      }),
      preHandler: [validateBody(recoverSchema)],
    },
    controller.recover.bind(controller),
  );

  app.post(
    "/refresh",
    {
      ...docRoute({
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
        body: refreshSchema,
        bodyExample: {
          refreshToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2NWYxYTJiIiwidHlwZSI6InJlZnJlc2gifQ.signature",
        },
        success: ok200(
          {
            type: "object",
            properties: { tokens: AuthTokensSchema },
            required: ["tokens"],
          },
          {
            tokens: {
              accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
        ),
        errors: [401],
      }),
      preHandler: [validateBody(refreshSchema)],
    },
    controller.refresh.bind(controller),
  );

  app.get(
    "/me",
    {
      ...docRoute({
        tags: ["Authentication"],
        summary: "Get current authenticated user",
        description: `
Return the authenticated user identity from the access token.

**Who should use it:** Any client that needs to hydrate session state.

**Business purpose:** Session introspection without re-login.

**Preconditions:** Valid Bearer access token.
        `.trim(),
        auth: "bearer",
        success: ok200(AuthenticatedUserSchema),
      }),
      preHandler: [authGuard],
    },
    controller.me.bind(controller),
  );

  app.post(
    "/logout",
    {
      ...docRoute({
        tags: ["Authentication"],
        summary: "Logout and revoke refresh tokens",
        description: `
Clear server-side refresh token hashes for the user.

**Who should use it:** Clients ending a session.

**Auth:** Optional Bearer. Body may include \`refreshToken\` for body-only revoke.

**Side effects:** Refresh tokens for the user are cleared (cannot refresh until login again).
        `.trim(),
        auth: "optional",
        body: logoutSchema,
        bodyExample: {
          refreshToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2NWYxYTJiIiwidHlwZSI6InJlZnJlc2gifQ.signature",
        },
        success: ok200(OkSchema, { ok: true }),
      }),
      preHandler: [
        async (request, reply) => {
          const header = request.headers.authorization;
          if (header) {
            await authGuard(request, reply);
          }
        },
      ],
    },
    async (request, reply) => {
      if (request.body && typeof request.body === "object") {
        const parsed = logoutSchema.safeParse(request.body);
        if (!parsed.success) {
          throw parsed.error;
        }
        request.body = parsed.data;
      } else {
        request.body = {};
      }
      return controller.logout(request, reply);
    },
  );
}
