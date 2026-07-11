import mongoose from "mongoose";
import { Role, User, UserStatus } from "@/models/rbac.model";

export class UserRepository {
  async findAll() {
    return User.find()
      .select("username usernameSlug createdAt role status")
      .lean();
  }

  async findById(id: string) {
    return User.findById(id).lean();
  }

  async findByIdWithRole(id: string) {
    return User.findById(id)
      .select(
        "username usernameNormalized usernameSlug role status failedLoginAttempts lockUntil createdAt updatedAt acceptedTermsAt",
      )
      .populate({ path: "role", select: "name" })
      .lean();
  }

  async listUsers(page: number, limit: number, filter: Record<string, unknown> = {}) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      User.find(filter)
        .select(
          "username usernameSlug role status failedLoginAttempts lockUntil createdAt updatedAt",
        )
        .populate({ path: "role", select: "name" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async countUsers(filter: Record<string, unknown> = {}) {
    return User.countDocuments(filter);
  }

  async updateStatus(userId: string, status: UserStatus) {
    return User.findByIdAndUpdate(
      userId,
      { status, updatedAt: new Date() },
      { new: true },
    )
      .select(
        "username usernameSlug role status failedLoginAttempts lockUntil createdAt updatedAt",
      )
      .populate({ path: "role", select: "name" })
      .lean();
  }

  async updateRole(userId: string, roleId: string) {
    return User.findByIdAndUpdate(
      userId,
      { role: roleId, updatedAt: new Date() },
      { new: true },
    )
      .select(
        "username usernameSlug role status failedLoginAttempts lockUntil createdAt updatedAt",
      )
      .populate({ path: "role", select: "name" })
      .lean();
  }

  async findByUsernameNormalized(usernameNormalized: string) {
    return User.findOne({ usernameNormalized }).lean();
  }

  async findAuthByUsernameNormalized(usernameNormalized: string) {
    return User.findOne({ usernameNormalized })
      .populate({
        path: "role",
        populate: { path: "permissions", select: "name" },
      })
      .lean();
  }

  async findAuthById(id: string) {
    return User.findById(id)
      .populate({
        path: "role",
        populate: { path: "permissions", select: "name" },
      })
      .lean();
  }

  async create(
    data: {
      username: string;
      usernameNormalized: string;
      usernameSlug: string;
      passwordHash: string;
      recoveryPassphraseHash: string;
      roleId: string;
      acceptedTermsAt: Date;
    },
    session?: mongoose.ClientSession,
  ) {
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
      const [doc] = await User.create([payload], { session });
      return doc;
    }

    return User.create(payload);
  }

  async findRoleByName(name: string) {
    return Role.findOne({ name }).lean();
  }

  async updatePassword(userId: string, passwordHash: string) {
    return User.findByIdAndUpdate(
      userId,
      {
        passwordHash,
        failedLoginAttempts: 0,
        lockUntil: null,
        // Force re-login after password change
        currentRefreshTokenHash: null,
        previousRefreshTokenHash: null,
        updatedAt: new Date(),
      },
      { new: true },
    ).lean();
  }

  async recordFailedLogin(userId: string, failedLoginAttempts: number, lockUntil: Date | null) {
    return User.findByIdAndUpdate(
      userId,
      { failedLoginAttempts, lockUntil, updatedAt: new Date() },
      { new: true },
    ).lean();
  }

  async clearLockout(userId: string) {
    return User.findByIdAndUpdate(
      userId,
      { failedLoginAttempts: 0, lockUntil: null, updatedAt: new Date() },
      { new: true },
    ).lean();
  }

  async setRefreshTokenHashes(
    userId: string,
    currentRefreshTokenHash: string | null,
    previousRefreshTokenHash: string | null,
  ) {
    return User.findByIdAndUpdate(
      userId,
      {
        currentRefreshTokenHash,
        previousRefreshTokenHash,
        updatedAt: new Date(),
      },
      { new: true },
    ).lean();
  }

  async clearRefreshTokens(userId: string) {
    return this.setRefreshTokenHashes(userId, null, null);
  }

  /** Compensation for failed registration (profile create failure). */
  async deleteById(userId: string) {
    return User.findByIdAndDelete(userId).lean();
  }
}
