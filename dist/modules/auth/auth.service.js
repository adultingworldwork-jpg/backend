"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongoose_1 = __importDefault(require("mongoose"));
const user_repository_1 = require("../../modules/user/user.repository");
const app_error_1 = require("../../utils/app-error");
const username_1 = require("../../utils/username");
const crypto_hash_1 = require("../../utils/crypto-hash");
const auth_constants_1 = require("./auth.constants");
class AuthService {
    constructor(deps) {
        this.deps = deps;
        this.repo = new user_repository_1.UserRepository();
    }
    get ctx() {
        return this.deps.ctx;
    }
    auditBase() {
        return {
            requestId: this.ctx?.requestId,
            ip: this.ctx?.ip,
            userAgent: this.ctx?.userAgent,
        };
    }
    async register(data) {
        if (data.acceptedTerms !== true) {
            throw app_error_1.AppError.fromCode("TERMS_REQUIRED");
        }
        let username;
        try {
            username = (0, username_1.assertValidUsername)(data.username);
        }
        catch (e) {
            throw app_error_1.AppError.fromCode("VALIDATION_ERROR", e instanceof Error ? e.message : "Invalid username");
        }
        const usernameNormalized = (0, username_1.normalizeUsername)(username);
        const usernameSlug = (0, username_1.slugifyUsername)(username);
        const existing = await this.repo.findByUsernameNormalized(usernameNormalized);
        if (existing) {
            await this.deps.audit.log({
                type: "auth.register.failure",
                ...this.auditBase(),
                username,
                reason: "username_exists",
            });
            throw app_error_1.AppError.fromCode("USERNAME_EXISTS");
        }
        const userRole = await this.repo.findRoleByName("user");
        if (!userRole) {
            throw app_error_1.AppError.fromCode("INTERNAL_SERVER_ERROR", "Default user role is missing. Run the seed script.");
        }
        const passwordHash = await bcrypt_1.default.hash(data.password, auth_constants_1.BCRYPT_ROUNDS);
        const recoveryPassphraseHash = await bcrypt_1.default.hash((0, username_1.normalizeRecoveryPassphrase)(data.recoveryPassphrase), auth_constants_1.BCRYPT_ROUNDS);
        if (!this.deps.profile) {
            throw app_error_1.AppError.fromCode("INTERNAL_SERVER_ERROR", "Profile service is not wired for registration");
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
            throw app_error_1.AppError.fromCode("INTERNAL_SERVER_ERROR", "User not found after registration");
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
    async createUserWithProfile(data) {
        const profile = this.deps.profile;
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
        const session = await mongoose_1.default.startSession();
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
        }
        catch (txError) {
            const isTxnUnsupported = txError instanceof Error &&
                (/Transaction numbers are only allowed|replica set|not supported|transaction/i.test(txError.message) ||
                    txError.codeName === "IllegalOperation" ||
                    txError.code === 20);
            if (!isTxnUnsupported) {
                this.deps.log?.error({ err: txError }, "register.transaction_failed");
                throw txError instanceof app_error_1.AppError
                    ? txError
                    : app_error_1.AppError.fromCode("PROFILE_CREATE_FAILED", "Registration failed while creating profile");
            }
            this.deps.log?.info("Mongo transactions unavailable — using compensation registration path");
        }
        finally {
            session.endSession();
        }
        // --- Compensation path (standalone Mongo) ---
        let createdId = null;
        try {
            const created = await this.repo.create(userPayload);
            createdId = String(created._id);
            await profile.createForNewUser({
                userId: createdId,
                displayName: data.displayName,
            });
            return createdId;
        }
        catch (compError) {
            if (createdId) {
                try {
                    await profile.deleteByUserId(createdId);
                }
                catch {
                    /* ignore */
                }
                try {
                    await this.repo.deleteById(createdId);
                }
                catch {
                    /* ignore */
                }
            }
            this.deps.log?.error({ err: compError }, "register.profile_compensation_failed");
            if (compError instanceof app_error_1.AppError)
                throw compError;
            throw app_error_1.AppError.fromCode("PROFILE_CREATE_FAILED", "Registration failed while creating profile");
        }
    }
    async login(data) {
        const usernameNormalized = (0, username_1.normalizeUsername)(data.username);
        const userDoc = await this.repo.findAuthByUsernameNormalized(usernameNormalized);
        if (!userDoc) {
            await this.deps.audit.log({
                type: "auth.login.failure",
                ...this.auditBase(),
                username: (0, username_1.trimUsername)(data.username),
                reason: "user_not_found",
            });
            throw app_error_1.AppError.invalidCredentials();
        }
        if (this.isLocked(userDoc.lockUntil)) {
            await this.deps.audit.log({
                type: "auth.login.failure",
                ...this.auditBase(),
                userId: String(userDoc._id),
                username: userDoc.username,
                reason: "account_locked",
            });
            throw app_error_1.AppError.accountLocked();
        }
        // Admin-managed status (SUSPENDED / LOCKED block login)
        const accountStatus = userDoc.status || "ACTIVE";
        if (accountStatus === "SUSPENDED" || accountStatus === "LOCKED") {
            await this.deps.audit.log({
                type: "auth.login.failure",
                ...this.auditBase(),
                userId: String(userDoc._id),
                username: userDoc.username,
                reason: `status_${accountStatus.toLowerCase()}`,
            });
            throw app_error_1.AppError.fromCode("ACCOUNT_LOCKED", accountStatus === "SUSPENDED"
                ? "Account is suspended"
                : "Account is locked");
        }
        const valid = await bcrypt_1.default.compare(data.password, userDoc.passwordHash);
        if (!valid) {
            await this.handleFailedLogin(userDoc);
            throw app_error_1.AppError.invalidCredentials();
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
    async adminLogin(data) {
        const admins = await this.repo.findAuthAdminUsers();
        if (!admins.length) {
            await this.deps.audit.log({
                type: "auth.login.failure",
                ...this.auditBase(),
                username: "admin",
                reason: "no_admin_accounts",
            });
            throw app_error_1.AppError.invalidCredentials();
        }
        let matched = null;
        let lockedMatch = false;
        let suspendedMatch = false;
        for (const userDoc of admins) {
            const valid = await bcrypt_1.default.compare(data.password, userDoc.passwordHash);
            if (!valid)
                continue;
            if (this.isLocked(userDoc.lockUntil)) {
                lockedMatch = true;
                continue;
            }
            const accountStatus = userDoc.status || "ACTIVE";
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
                throw app_error_1.AppError.accountLocked();
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
            throw app_error_1.AppError.invalidCredentials();
        }
        await this.repo.clearLockout(String(matched._id));
        const user = this.toAuthenticatedUser(matched);
        // Defense in depth: only admin-role users are returned by findAuthAdminUsers
        if ((user.role || "").toLowerCase() !== "admin") {
            throw app_error_1.AppError.fromCode("ADMIN_REQUIRED");
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
    async recover(data) {
        const usernameNormalized = (0, username_1.normalizeUsername)(data.username);
        const userDoc = await this.repo.findAuthByUsernameNormalized(usernameNormalized);
        if (!userDoc) {
            await this.deps.audit.log({
                type: "auth.recover.failure",
                ...this.auditBase(),
                username: (0, username_1.trimUsername)(data.username),
                reason: "user_not_found",
            });
            // Same message as mismatch — avoid username enumeration
            throw app_error_1.AppError.fromCode("INVALID_RECOVERY");
        }
        if (this.isLocked(userDoc.lockUntil)) {
            throw app_error_1.AppError.accountLocked();
        }
        const passphraseOk = await bcrypt_1.default.compare((0, username_1.normalizeRecoveryPassphrase)(data.recoveryPassphrase), userDoc.recoveryPassphraseHash);
        if (!passphraseOk) {
            await this.deps.audit.log({
                type: "auth.recover.failure",
                ...this.auditBase(),
                userId: String(userDoc._id),
                username: userDoc.username,
                reason: "passphrase_mismatch",
            });
            throw app_error_1.AppError.fromCode("INVALID_RECOVERY");
        }
        const passwordHash = await bcrypt_1.default.hash(data.newPassword, auth_constants_1.BCRYPT_ROUNDS);
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
    async refresh(refreshToken) {
        let decoded;
        try {
            decoded = this.deps.jwt.verifyRefresh(refreshToken);
        }
        catch {
            await this.deps.audit.log({
                type: "auth.refresh.failure",
                ...this.auditBase(),
                reason: "jwt_invalid",
            });
            throw app_error_1.AppError.fromCode("INVALID_REFRESH_TOKEN");
        }
        const userId = String(decoded.id);
        const userDoc = await this.repo.findAuthById(userId);
        if (!userDoc) {
            throw app_error_1.AppError.fromCode("INVALID_REFRESH_TOKEN");
        }
        const presentedHash = (0, crypto_hash_1.sha256)(refreshToken);
        const current = userDoc.currentRefreshTokenHash;
        const previous = userDoc.previousRefreshTokenHash;
        if (current && (0, crypto_hash_1.safeEqualHex)(presentedHash, current)) {
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
        if (previous && (0, crypto_hash_1.safeEqualHex)(presentedHash, previous)) {
            await this.repo.clearRefreshTokens(userId);
            await this.deps.audit.log({
                type: "auth.refresh.reuse_detected",
                ...this.auditBase(),
                userId,
                username: userDoc.username,
                reason: "previous_token_presented",
            });
            throw app_error_1.AppError.fromCode("REFRESH_TOKEN_REUSE");
        }
        await this.deps.audit.log({
            type: "auth.refresh.failure",
            ...this.auditBase(),
            userId,
            username: userDoc.username,
            reason: "hash_mismatch",
        });
        throw app_error_1.AppError.fromCode("INVALID_REFRESH_TOKEN");
    }
    async logout(userId, refreshToken) {
        let id = userId;
        if (!id && refreshToken) {
            try {
                const decoded = this.deps.jwt.verifyRefresh(refreshToken);
                id = String(decoded.id);
            }
            catch {
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
    async me(userId) {
        const userDoc = await this.repo.findAuthById(userId);
        if (!userDoc) {
            throw app_error_1.AppError.fromCode("USER_NOT_FOUND");
        }
        return this.toAuthenticatedUser(userDoc);
    }
    /**
     * Issue a fresh access + refresh pair for an existing user id.
     * Used by therapist PIN verify (linked User) after credential check.
     */
    async issueSessionForUserId(userId) {
        const userDoc = await this.repo.findAuthById(userId);
        if (!userDoc) {
            throw app_error_1.AppError.fromCode("USER_NOT_FOUND");
        }
        const accountStatus = userDoc.status || "ACTIVE";
        if (accountStatus === "SUSPENDED" || accountStatus === "LOCKED") {
            throw app_error_1.AppError.fromCode("ACCOUNT_LOCKED", accountStatus === "SUSPENDED"
                ? "Account is suspended"
                : "Account is locked");
        }
        if (this.isLocked(userDoc.lockUntil)) {
            throw app_error_1.AppError.accountLocked();
        }
        const user = this.toAuthenticatedUser(userDoc);
        const tokens = await this.issueTokenPair(user);
        await this.deps.audit.log({
            type: "auth.login.success",
            ...this.auditBase(),
            userId: user.id,
            username: user.username,
            metadata: { via: "therapist_verify" },
        });
        return { user, tokens };
    }
    async issueTokenPair(user, previousHash = null) {
        const payload = {
            id: user.id,
            username: user.username,
            role: user.role,
            permissions: user.permissions,
        };
        const accessToken = this.deps.jwt.sign(payload, "user", "access");
        const refreshToken = this.deps.jwt.sign(payload, "user", "refresh");
        const currentHash = (0, crypto_hash_1.sha256)(refreshToken);
        await this.repo.setRefreshTokenHashes(user.id, currentHash, previousHash);
        return { accessToken, refreshToken };
    }
    isLocked(lockUntil) {
        if (!lockUntil)
            return false;
        return new Date(lockUntil).getTime() > Date.now();
    }
    async handleFailedLogin(userDoc) {
        const attempts = (userDoc.failedLoginAttempts ?? 0) + 1;
        const userId = String(userDoc._id);
        if (attempts >= auth_constants_1.MAX_FAILED_LOGIN_ATTEMPTS) {
            const lockUntil = new Date(Date.now() + auth_constants_1.LOCKOUT_DURATION_MS);
            await this.repo.recordFailedLogin(userId, attempts, lockUntil);
            await this.deps.audit.log({
                type: "auth.lockout",
                ...this.auditBase(),
                userId,
                username: userDoc.username,
                metadata: { attempts, lockUntilMs: auth_constants_1.LOCKOUT_DURATION_MS },
            });
            await this.deps.audit.log({
                type: "auth.login.failure",
                ...this.auditBase(),
                userId,
                username: userDoc.username,
                reason: "bad_password_locked",
            });
            throw app_error_1.AppError.accountLocked();
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
    toAuthenticatedUser(user) {
        return {
            id: String(user._id),
            username: user.username,
            usernameSlug: user.usernameSlug,
            role: user.role?.name ?? null,
            permissions: user.role?.permissions?.map((p) => p.name) ?? [],
            createdAt: user.createdAt,
        };
    }
}
exports.AuthService = AuthService;
