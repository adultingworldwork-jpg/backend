import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { FastifyBaseLogger } from "fastify";
import { UserRepository } from "@/modules/user/user.repository";
import { AppError } from "@/utils/app-error";
import { RequestContext } from "@/types/request-context";
import { SecurityAuditLogger } from "@/core/interfaces/security-audit";
import {
  assertValidUsername,
  normalizeRecoveryPassphrase,
  normalizeUsername,
  slugifyUsername,
  trimUsername,
} from "@/utils/username";
import { safeEqualHex, sha256 } from "@/utils/crypto-hash";
import {
  BCRYPT_ROUNDS,
  LOCKOUT_DURATION_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from "./auth.constants";
import {
  AdminLoginInput,
  LoginInput,
  RecoverInput,
  RegisterInput,
} from "./auth.schema";
import type { JwtSignPayload, TokenType, UserType } from "@/plugins/jwt.plugin";

/** Minimal profile port — Auth does not own Profile model details. */
export type ProfileOnRegister = {
  createForNewUser(input: {
    userId: string;
    displayName: string;
    session?: mongoose.ClientSession;
  }): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
};

export interface AuthenticatedUser {
  id: string;
  username: string;
  usernameSlug: string;
  role: string | null;
  permissions: string[];
  createdAt: Date;
}

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResult = {
  user: AuthenticatedUser;
  tokens: AuthTokens;
};

type JwtApi = {
  sign: (
    payload: JwtSignPayload,
    userType: UserType,
    tokenType: TokenType,
  ) => string;
  verifyAccess: (token: string) => any;
  verifyRefresh: (token: string) => any;
};

export type AuthServiceDeps = {
  ctx?: RequestContext;
  jwt: JwtApi;
  audit: SecurityAuditLogger;
  log?: FastifyBaseLogger;
  /** Required for registration to create default Profile */
  profile?: ProfileOnRegister;
};

export class AuthService {
  private repo = new UserRepository();

  constructor(private deps: AuthServiceDeps) {}

  private get ctx() {
    return this.deps.ctx;
  }

  private auditBase() {
    return {
      requestId: this.ctx?.requestId,
      ip: this.ctx?.ip,
      userAgent: this.ctx?.userAgent,
    };
  }

  async register(data: RegisterInput): Promise<AuthResult> {
    if (data.acceptedTerms !== true) {
      throw AppError.fromCode("TERMS_REQUIRED");
    }

    let username: string;
    try {
      username = assertValidUsername(data.username);
    } catch (e) {
      throw AppError.fromCode(
        "VALIDATION_ERROR",
        e instanceof Error ? e.message : "Invalid username",
      );
    }

    const usernameNormalized = normalizeUsername(username);
    const usernameSlug = slugifyUsername(username);

    const existing = await this.repo.findByUsernameNormalized(usernameNormalized);
    if (existing) {
      await this.deps.audit.log({
        type: "auth.register.failure",
        ...this.auditBase(),
        username,
        reason: "username_exists",
      });
      throw AppError.fromCode("USERNAME_EXISTS");
    }

    const userRole = await this.repo.findRoleByName("user");
    if (!userRole) {
      throw AppError.fromCode(
        "INTERNAL_SERVER_ERROR",
        "Default user role is missing. Run the seed script.",
      );
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const recoveryPassphraseHash = await bcrypt.hash(
      normalizeRecoveryPassphrase(data.recoveryPassphrase),
      BCRYPT_ROUNDS,
    );

    if (!this.deps.profile) {
      throw AppError.fromCode(
        "INTERNAL_SERVER_ERROR",
        "Profile service is not wired for registration",
      );
    }

    const userId = await this.createUserWithProfile({
      username,
      usernameNormalized,
      usernameSlug,
      passwordHash,
      recoveryPassphraseHash,
      roleId: String(userRole._id),
      acceptedTermsAt: new Date(),
      displayName: username,
    });

    const userDoc = await this.repo.findAuthById(userId);
    if (!userDoc) {
      throw AppError.fromCode("INTERNAL_SERVER_ERROR", "User not found after registration");
    }

    const user = this.toAuthenticatedUser(userDoc);
    const tokens = await this.issueTokenPair(user);

    await this.deps.audit.log({
      type: "auth.register.success",
      ...this.auditBase(),
      userId: user.id,
      username: user.username,
    });

    return { user, tokens };
  }

  /**
   * Atomic user + profile creation.
   * Prefers Mongo multi-document transaction; falls back to create+compensate.
   */
  private async createUserWithProfile(data: {
    username: string;
    usernameNormalized: string;
    usernameSlug: string;
    passwordHash: string;
    recoveryPassphraseHash: string;
    roleId: string;
    acceptedTermsAt: Date;
    displayName: string;
  }): Promise<string> {
    const profile = this.deps.profile!;
    const userPayload = {
      username: data.username,
      usernameNormalized: data.usernameNormalized,
      usernameSlug: data.usernameSlug,
      passwordHash: data.passwordHash,
      recoveryPassphraseHash: data.recoveryPassphraseHash,
      roleId: data.roleId,
      acceptedTermsAt: data.acceptedTermsAt,
    };

    // --- Try multi-doc transaction (replica set) ---
    const session = await mongoose.startSession();
    try {
      let userId = "";
      await session.withTransaction(async () => {
        const created = await this.repo.create(userPayload, session);
        userId = String(created._id);
        await profile.createForNewUser({
          userId,
          displayName: data.displayName,
          session,
        });
      });
      return userId;
    } catch (txError) {
      const isTxnUnsupported =
        txError instanceof Error &&
        (/Transaction numbers are only allowed|replica set|not supported|transaction/i.test(
          txError.message,
        ) ||
          (txError as { codeName?: string }).codeName === "IllegalOperation" ||
          (txError as { code?: number }).code === 20);

      if (!isTxnUnsupported) {
        this.deps.log?.error({ err: txError }, "register.transaction_failed");
        throw txError instanceof AppError
          ? txError
          : AppError.fromCode(
              "PROFILE_CREATE_FAILED",
              "Registration failed while creating profile",
            );
      }

      this.deps.log?.info(
        "Mongo transactions unavailable — using compensation registration path",
      );
    } finally {
      session.endSession();
    }

    // --- Compensation path (standalone Mongo) ---
    let createdId: string | null = null;
    try {
      const created = await this.repo.create(userPayload);
      createdId = String(created._id);
      await profile.createForNewUser({
        userId: createdId,
        displayName: data.displayName,
      });
      return createdId;
    } catch (compError) {
      if (createdId) {
        try {
          await profile.deleteByUserId(createdId);
        } catch {
          /* ignore */
        }
        try {
          await this.repo.deleteById(createdId);
        } catch {
          /* ignore */
        }
      }
      this.deps.log?.error({ err: compError }, "register.profile_compensation_failed");
      if (compError instanceof AppError) throw compError;
      throw AppError.fromCode(
        "PROFILE_CREATE_FAILED",
        "Registration failed while creating profile",
      );
    }
  }

  async login(data: LoginInput): Promise<AuthResult> {
    const usernameNormalized = normalizeUsername(data.username);
    const userDoc = await this.repo.findAuthByUsernameNormalized(usernameNormalized);

    if (!userDoc) {
      await this.deps.audit.log({
        type: "auth.login.failure",
        ...this.auditBase(),
        username: trimUsername(data.username),
        reason: "user_not_found",
      });
      throw AppError.invalidCredentials();
    }

    if (this.isLocked(userDoc.lockUntil)) {
      await this.deps.audit.log({
        type: "auth.login.failure",
        ...this.auditBase(),
        userId: String(userDoc._id),
        username: userDoc.username,
        reason: "account_locked",
      });
      throw AppError.accountLocked();
    }

    // Admin-managed status (SUSPENDED / LOCKED block login)
    const accountStatus = (userDoc as { status?: string }).status || "ACTIVE";
    if (accountStatus === "SUSPENDED" || accountStatus === "LOCKED") {
      await this.deps.audit.log({
        type: "auth.login.failure",
        ...this.auditBase(),
        userId: String(userDoc._id),
        username: userDoc.username,
        reason: `status_${accountStatus.toLowerCase()}`,
      });
      throw AppError.fromCode(
        "ACCOUNT_LOCKED",
        accountStatus === "SUSPENDED"
          ? "Account is suspended"
          : "Account is locked",
      );
    }

    const valid = await bcrypt.compare(data.password, userDoc.passwordHash);

    if (!valid) {
      await this.handleFailedLogin(userDoc);
      throw AppError.invalidCredentials();
    }

    await this.repo.clearLockout(String(userDoc._id));

    const user = this.toAuthenticatedUser(userDoc);
    const tokens = await this.issueTokenPair(user);

    await this.deps.audit.log({
      type: "auth.login.success",
      ...this.auditBase(),
      userId: user.id,
      username: user.username,
    });

    // Admin login audit (no secrets / no content)
    if ((user.role || "").toLowerCase() === "admin") {
      await this.deps.audit.log({
        type: "ADMIN_LOGIN",
        ...this.auditBase(),
        userId: user.id,
        username: user.username,
      });
    }

    return { user, tokens };
  }

  /**
   * Password-only Admin Panel login.
   * Verifies the password against users with the platform `admin` role
   * (same bcrypt + lockout rules as standard login). No username field required.
   */
  async adminLogin(data: AdminLoginInput): Promise<AuthResult> {
    const admins = await this.repo.findAuthAdminUsers();

    if (!admins.length) {
      await this.deps.audit.log({
        type: "auth.login.failure",
        ...this.auditBase(),
        username: "admin",
        reason: "no_admin_accounts",
      });
      throw AppError.invalidCredentials();
    }

    let matched: (typeof admins)[number] | null = null;
    let lockedMatch = false;
    let suspendedMatch = false;

    for (const userDoc of admins) {
      const valid = await bcrypt.compare(data.password, userDoc.passwordHash);
      if (!valid) continue;

      if (this.isLocked(userDoc.lockUntil)) {
        lockedMatch = true;
        continue;
      }

      const accountStatus = (userDoc as { status?: string }).status || "ACTIVE";
      if (accountStatus === "SUSPENDED" || accountStatus === "LOCKED") {
        suspendedMatch = true;
        continue;
      }

      matched = userDoc;
      break;
    }

    if (!matched) {
      if (lockedMatch || suspendedMatch) {
        await this.deps.audit.log({
          type: "auth.login.failure",
          ...this.auditBase(),
          username: "admin",
          reason: lockedMatch ? "account_locked" : "status_suspended",
        });
        throw AppError.accountLocked();
      }

      // Record failed attempt against the primary (oldest) admin for lockout parity
      const primary = admins[0];
      if (primary) {
        await this.handleFailedLogin(primary);
      }
      await this.deps.audit.log({
        type: "auth.login.failure",
        ...this.auditBase(),
        username: "admin",
        reason: "bad_password",
      });
      throw AppError.invalidCredentials();
    }

    await this.repo.clearLockout(String(matched._id));

    const user = this.toAuthenticatedUser(matched);
    // Defense in depth: only admin-role users are returned by findAuthAdminUsers
    if ((user.role || "").toLowerCase() !== "admin") {
      throw AppError.fromCode("ADMIN_REQUIRED");
    }

    const tokens = await this.issueTokenPair(user);

    await this.deps.audit.log({
      type: "auth.login.success",
      ...this.auditBase(),
      userId: user.id,
      username: user.username,
    });
    await this.deps.audit.log({
      type: "ADMIN_LOGIN",
      ...this.auditBase(),
      userId: user.id,
      username: user.username,
    });

    return { user, tokens };
  }

  async recover(data: RecoverInput): Promise<{ ok: true }> {
    const usernameNormalized = normalizeUsername(data.username);
    const userDoc = await this.repo.findAuthByUsernameNormalized(usernameNormalized);

    if (!userDoc) {
      await this.deps.audit.log({
        type: "auth.recover.failure",
        ...this.auditBase(),
        username: trimUsername(data.username),
        reason: "user_not_found",
      });
      // Same message as mismatch — avoid username enumeration
      throw AppError.fromCode("INVALID_RECOVERY");
    }

    if (this.isLocked(userDoc.lockUntil)) {
      throw AppError.accountLocked();
    }

    const passphraseOk = await bcrypt.compare(
      normalizeRecoveryPassphrase(data.recoveryPassphrase),
      userDoc.recoveryPassphraseHash,
    );

    if (!passphraseOk) {
      await this.deps.audit.log({
        type: "auth.recover.failure",
        ...this.auditBase(),
        userId: String(userDoc._id),
        username: userDoc.username,
        reason: "passphrase_mismatch",
      });
      throw AppError.fromCode("INVALID_RECOVERY");
    }

    const passwordHash = await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS);
    await this.repo.updatePassword(String(userDoc._id), passwordHash);

    await this.deps.audit.log({
      type: "auth.recover.success",
      ...this.auditBase(),
      userId: String(userDoc._id),
      username: userDoc.username,
    });

    return { ok: true };
  }

  /**
   * Refresh with rotation: old refresh token is invalidated; new pair issued.
   * Reuse of a rotated token revokes the session family.
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    let decoded: any;
    try {
      decoded = this.deps.jwt.verifyRefresh(refreshToken);
    } catch {
      await this.deps.audit.log({
        type: "auth.refresh.failure",
        ...this.auditBase(),
        reason: "jwt_invalid",
      });
      throw AppError.fromCode("INVALID_REFRESH_TOKEN");
    }

    const userId = String(decoded.id);
    const userDoc = await this.repo.findAuthById(userId);

    if (!userDoc) {
      throw AppError.fromCode("INVALID_REFRESH_TOKEN");
    }

    const presentedHash = sha256(refreshToken);
    const current = userDoc.currentRefreshTokenHash as string | null | undefined;
    const previous = userDoc.previousRefreshTokenHash as string | null | undefined;

    if (current && safeEqualHex(presentedHash, current)) {
      // Happy path — rotate
      const user = this.toAuthenticatedUser(userDoc);
      const tokens = await this.issueTokenPair(user, current);

      await this.deps.audit.log({
        type: "auth.refresh.success",
        ...this.auditBase(),
        userId: user.id,
        username: user.username,
      });

      return tokens;
    }

    // Reuse detection: presented token matches previous (already rotated)
    if (previous && safeEqualHex(presentedHash, previous)) {
      await this.repo.clearRefreshTokens(userId);
      await this.deps.audit.log({
        type: "auth.refresh.reuse_detected",
        ...this.auditBase(),
        userId,
        username: userDoc.username,
        reason: "previous_token_presented",
      });
      throw AppError.fromCode("REFRESH_TOKEN_REUSE");
    }

    await this.deps.audit.log({
      type: "auth.refresh.failure",
      ...this.auditBase(),
      userId,
      username: userDoc.username,
      reason: "hash_mismatch",
    });
    throw AppError.fromCode("INVALID_REFRESH_TOKEN");
  }

  async logout(userId?: string, refreshToken?: string): Promise<{ ok: true }> {
    let id = userId;

    if (!id && refreshToken) {
      try {
        const decoded = this.deps.jwt.verifyRefresh(refreshToken) as { id: string };
        id = String(decoded.id);
      } catch {
        // still ok — logout is best-effort
      }
    }

    if (id) {
      await this.repo.clearRefreshTokens(id);
      await this.deps.audit.log({
        type: "auth.logout",
        ...this.auditBase(),
        userId: id,
      });
    }

    return { ok: true };
  }

  async me(userId: string): Promise<AuthenticatedUser> {
    const userDoc = await this.repo.findAuthById(userId);
    if (!userDoc) {
      throw AppError.fromCode("USER_NOT_FOUND");
    }
    return this.toAuthenticatedUser(userDoc);
  }

  private async issueTokenPair(
    user: AuthenticatedUser,
    previousHash: string | null = null,
  ): Promise<AuthTokens> {
    const payload: JwtSignPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
    };

    const accessToken = this.deps.jwt.sign(payload, "user", "access");
    const refreshToken = this.deps.jwt.sign(payload, "user", "refresh");
    const currentHash = sha256(refreshToken);

    await this.repo.setRefreshTokenHashes(user.id, currentHash, previousHash);

    return { accessToken, refreshToken };
  }

  private isLocked(lockUntil: Date | string | null | undefined): boolean {
    if (!lockUntil) return false;
    return new Date(lockUntil).getTime() > Date.now();
  }

  private async handleFailedLogin(userDoc: {
    _id: unknown;
    username: string;
    failedLoginAttempts?: number;
  }) {
    const attempts = (userDoc.failedLoginAttempts ?? 0) + 1;
    const userId = String(userDoc._id);

    if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      await this.repo.recordFailedLogin(userId, attempts, lockUntil);
      await this.deps.audit.log({
        type: "auth.lockout",
        ...this.auditBase(),
        userId,
        username: userDoc.username,
        metadata: { attempts, lockUntilMs: LOCKOUT_DURATION_MS },
      });
      await this.deps.audit.log({
        type: "auth.login.failure",
        ...this.auditBase(),
        userId,
        username: userDoc.username,
        reason: "bad_password_locked",
      });
      throw AppError.accountLocked();
    }

    await this.repo.recordFailedLogin(userId, attempts, null);
    await this.deps.audit.log({
      type: "auth.login.failure",
      ...this.auditBase(),
      userId,
      username: userDoc.username,
      reason: "bad_password",
      metadata: { attempts },
    });
  }

  private toAuthenticatedUser(user: any): AuthenticatedUser {
    return {
      id: String(user._id),
      username: user.username,
      usernameSlug: user.usernameSlug,
      role: user.role?.name ?? null,
      permissions:
        user.role?.permissions?.map((p: { name: string }) => p.name) ?? [],
      createdAt: user.createdAt,
    };
  }
}
