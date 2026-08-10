"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const rbac_model_1 = require("../../models/rbac.model");
class UserRepository {
    async findAll() {
        return rbac_model_1.User.find()
            .select("username usernameSlug createdAt role status")
            .lean();
    }
    async findById(id) {
        return rbac_model_1.User.findById(id).lean();
    }
    async findByIdWithRole(id) {
        return rbac_model_1.User.findById(id)
            .select("username usernameNormalized usernameSlug role status failedLoginAttempts lockUntil createdAt updatedAt acceptedTermsAt")
            .populate({ path: "role", select: "name" })
            .lean();
    }
    async listUsers(page, limit, filter = {}) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            rbac_model_1.User.find(filter)
                .select("username usernameSlug role status failedLoginAttempts lockUntil createdAt updatedAt")
                .populate({ path: "role", select: "name" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            rbac_model_1.User.countDocuments(filter),
        ]);
        return { items, total, page, limit };
    }
    async countUsers(filter = {}) {
        return rbac_model_1.User.countDocuments(filter);
    }
    async updateStatus(userId, status) {
        return rbac_model_1.User.findByIdAndUpdate(userId, { status, updatedAt: new Date() }, { new: true })
            .select("username usernameSlug role status failedLoginAttempts lockUntil createdAt updatedAt")
            .populate({ path: "role", select: "name" })
            .lean();
    }
    async updateRole(userId, roleId) {
        return rbac_model_1.User.findByIdAndUpdate(userId, { role: roleId, updatedAt: new Date() }, { new: true })
            .select("username usernameSlug role status failedLoginAttempts lockUntil createdAt updatedAt")
            .populate({ path: "role", select: "name" })
            .lean();
    }
    async findByUsernameNormalized(usernameNormalized) {
        return rbac_model_1.User.findOne({ usernameNormalized }).lean();
    }
    async findAuthByUsernameNormalized(usernameNormalized) {
        return rbac_model_1.User.findOne({ usernameNormalized })
            .populate({
            path: "role",
            populate: { path: "permissions", select: "name" },
        })
            .lean();
    }
    async findAuthById(id) {
        return rbac_model_1.User.findById(id)
            .populate({
            path: "role",
            populate: { path: "permissions", select: "name" },
        })
            .lean();
    }
    /**
     * Auth-ready users with the platform `admin` role (password hashes included).
     * Used by password-only Admin Panel login — no username field on the UI.
     */
    async findAuthAdminUsers() {
        const adminRole = await rbac_model_1.Role.findOne({ name: "admin" }).lean();
        if (!adminRole)
            return [];
        return rbac_model_1.User.find({ role: adminRole._id })
            .populate({
            path: "role",
            populate: { path: "permissions", select: "name" },
        })
            .lean();
    }
    async create(data, session) {
        const payload = {
            username: data.username,
            usernameNormalized: data.usernameNormalized,
            usernameSlug: data.usernameSlug,
            passwordHash: data.passwordHash,
            recoveryPassphraseHash: data.recoveryPassphraseHash,
            role: data.roleId,
            acceptedTermsAt: data.acceptedTermsAt,
            status: "ACTIVE",
            failedLoginAttempts: 0,
            lockUntil: null,
            currentRefreshTokenHash: null,
            previousRefreshTokenHash: null,
        };
        if (session) {
            const [doc] = await rbac_model_1.User.create([payload], { session });
            return doc;
        }
        return rbac_model_1.User.create(payload);
    }
    async findRoleByName(name) {
        return rbac_model_1.Role.findOne({ name }).lean();
    }
    async updatePassword(userId, passwordHash) {
        return rbac_model_1.User.findByIdAndUpdate(userId, {
            passwordHash,
            failedLoginAttempts: 0,
            lockUntil: null,
            // Force re-login after password change
            currentRefreshTokenHash: null,
            previousRefreshTokenHash: null,
            updatedAt: new Date(),
        }, { new: true }).lean();
    }
    async recordFailedLogin(userId, failedLoginAttempts, lockUntil) {
        return rbac_model_1.User.findByIdAndUpdate(userId, { failedLoginAttempts, lockUntil, updatedAt: new Date() }, { new: true }).lean();
    }
    async clearLockout(userId) {
        return rbac_model_1.User.findByIdAndUpdate(userId, { failedLoginAttempts: 0, lockUntil: null, updatedAt: new Date() }, { new: true }).lean();
    }
    async setRefreshTokenHashes(userId, currentRefreshTokenHash, previousRefreshTokenHash) {
        return rbac_model_1.User.findByIdAndUpdate(userId, {
            currentRefreshTokenHash,
            previousRefreshTokenHash,
            updatedAt: new Date(),
        }, { new: true }).lean();
    }
    async clearRefreshTokens(userId) {
        return this.setRefreshTokenHashes(userId, null, null);
    }
    /** Compensation for failed registration (profile create failure). */
    async deleteById(userId) {
        return rbac_model_1.User.findByIdAndDelete(userId).lean();
    }
}
exports.UserRepository = UserRepository;
