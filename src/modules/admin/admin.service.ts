import { RequestContext } from "@/types/request-context";
import { SecurityAuditLogger } from "@/core/interfaces/security-audit";
import { AppError } from "@/utils/app-error";
import { UserStatus } from "@/models/rbac.model";
import { UserRepository } from "@/modules/user/user.repository";
import { ProfileRepository } from "@/modules/profile/profile.repository";
import { BlogRepository } from "@/modules/blog/blog.repository";
import { CommunityRepository } from "@/modules/community/community.repository";
import { JournalRepository } from "@/modules/journal/journal.repository";
import { LettersRepository } from "@/modules/letters/letters.repository";
import { ResourcesRepository } from "@/modules/resources/resources.repository";
import {
  Conversation,
  Message,
} from "@/modules/chat/chat.model";
import {
  CreateTherapistInput,
  PaginationQuery,
  UpdateTherapistInput,
  UpdateUserRoleInput,
  UpdateUserStatusInput,
  VerifyTherapistInput,
} from "./admin.schema";
import { Therapist } from "./therapist.model";

export type AdminDashboardStats = {
  totalUsers: number;
  activeUsers: number;
  profiles: number;
  blogPosts: number;
  communityPosts: number;
  comments: number;
  journalsCount: number;
  lettersCount: number;
  therapyResources: number;
  conversationsCount: number;
  messagesCount: number;
};

export type AdminUserDto = {
  id: string;
  username: string;
  usernameSlug: string;
  role: string | null;
  status: UserStatus;
  failedLoginAttempts: number;
  lockUntil: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type PaginatedAdminUsers = {
  items: AdminUserDto[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type AdminServiceDeps = {
  ctx?: RequestContext;
  audit: SecurityAuditLogger;
};

/**
 * Admin orchestration layer — reuses repositories; does not reimplement domain rules.
 * Privacy: never exposes journals, private letters, or chat message content.
 */
export class AdminService {
  private users = new UserRepository();
  private profiles = new ProfileRepository();
  private blogs = new BlogRepository();
  private community = new CommunityRepository();
  private journals = new JournalRepository();
  private letters = new LettersRepository();
  private resources = new ResourcesRepository();

  constructor(private deps: AdminServiceDeps) {}

  private get ctx() {
    return this.deps.ctx;
  }

  private requireAdminId(): string {
    const id = this.ctx?.user?.id;
    const role = (this.ctx?.user?.role || "").toLowerCase();
    const perms = this.ctx?.user?.permissions || [];
    if (!id) throw AppError.fromCode("UNAUTHORIZED");
    if (role !== "admin" && !perms.includes("admin.access")) {
      throw AppError.fromCode("ADMIN_REQUIRED");
    }
    return id;
  }

  private audit(
    type:
      | "ADMIN_USER_UPDATED"
      | "ADMIN_CONTENT_DELETED"
      | "ADMIN_ROLE_UPDATED"
      | "ADMIN_STATUS_UPDATED",
    metadata: Record<string, string | number | boolean | null | undefined>,
  ) {
    return this.deps.audit.log({
      type,
      requestId: this.ctx?.requestId,
      ip: this.ctx?.ip,
      userAgent: this.ctx?.userAgent,
      userId: this.ctx?.user?.id,
      username: this.ctx?.user?.username,
      metadata,
    });
  }

  private meta(total: number, page: number, limit: number) {
    return {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit) || 1),
    };
  }

  // ── Dashboard ──────────────────────────────────────────

  async getDashboard(): Promise<AdminDashboardStats> {
    this.requireAdminId();

    const [
      totalUsers,
      activeUsers,
      profiles,
      blogPosts,
      communityPosts,
      comments,
      journalsCount,
      lettersCount,
      therapyResources,
      conversationsCount,
      messagesCount,
    ] = await Promise.all([
      this.users.countUsers({}),
      // Missing status (pre-migration docs) treated as ACTIVE
      this.users.countUsers({
        $or: [
          { status: "ACTIVE" },
          { status: { $exists: false } },
          { status: null },
        ],
      }),
      this.profiles.countAll(),
      this.blogs.countAll(),
      this.community.countPosts(),
      this.community.countComments(),
      this.journals.countAll(),
      this.letters.countAll(),
      this.resources.countAll(),
      Conversation.countDocuments({}),
      Message.countDocuments({}),
    ]);

    return {
      totalUsers,
      activeUsers,
      profiles,
      blogPosts,
      communityPosts,
      comments,
      journalsCount,
      lettersCount,
      therapyResources,
      conversationsCount,
      messagesCount,
    };
  }

  // ── Users ──────────────────────────────────────────────

  async listUsers(query: PaginationQuery): Promise<PaginatedAdminUsers> {
    this.requireAdminId();
    const result = await this.users.listUsers(query.page, query.limit);
    return {
      items: result.items.map((u) => this.toUserDto(u)),
      meta: this.meta(result.total, result.page, result.limit),
    };
  }

  async getUser(id: string): Promise<AdminUserDto> {
    this.requireAdminId();
    const user = await this.users.findByIdWithRole(id);
    if (!user) throw AppError.fromCode("USER_NOT_FOUND");
    return this.toUserDto(user);
  }

  async updateUserStatus(
    id: string,
    input: UpdateUserStatusInput,
  ): Promise<AdminUserDto> {
    this.requireAdminId();
    const existing = await this.users.findByIdWithRole(id);
    if (!existing) throw AppError.fromCode("USER_NOT_FOUND");

    const updated = await this.users.updateStatus(id, input.status);
    if (!updated) throw AppError.fromCode("USER_NOT_FOUND");

    // Invalidate sessions when suspending/locking
    if (input.status === "SUSPENDED" || input.status === "LOCKED") {
      await this.users.clearRefreshTokens(id);
    }

    await this.audit("ADMIN_STATUS_UPDATED", {
      targetUserId: id,
      status: input.status,
    });
    await this.audit("ADMIN_USER_UPDATED", {
      targetUserId: id,
      field: "status",
      status: input.status,
    });

    return this.toUserDto(updated);
  }

  async updateUserRole(
    id: string,
    input: UpdateUserRoleInput,
  ): Promise<AdminUserDto> {
    const adminId = this.requireAdminId();

    if (id === adminId) {
      throw AppError.fromCode("ADMIN_CANNOT_MODIFY_SELF");
    }

    const existing = await this.users.findByIdWithRole(id);
    if (!existing) throw AppError.fromCode("USER_NOT_FOUND");

    const roleName = input.role === "ADMIN" ? "admin" : "user";
    const roleDoc = await this.users.findRoleByName(roleName);
    if (!roleDoc) {
      throw AppError.fromCode(
        "ADMIN_INVALID_ROLE",
        `Role "${roleName}" is not seeded`,
      );
    }

    const updated = await this.users.updateRole(id, String(roleDoc._id));
    if (!updated) throw AppError.fromCode("USER_NOT_FOUND");

    // Force re-login after role change
    await this.users.clearRefreshTokens(id);

    await this.audit("ADMIN_ROLE_UPDATED", {
      targetUserId: id,
      role: input.role,
    });
    await this.audit("ADMIN_USER_UPDATED", {
      targetUserId: id,
      field: "role",
      role: input.role,
    });

    return this.toUserDto(updated);
  }

  // ── Blog moderation ────────────────────────────────────

  async listBlogs(query: PaginationQuery) {
    this.requireAdminId();
    const result = await this.blogs.listAll(query.page, query.limit);
    return {
      items: result.items.map((b) => this.toBlogSummary(b)),
      meta: this.meta(result.total, result.page, result.limit),
    };
  }

  async deleteBlog(id: string): Promise<{ ok: true }> {
    this.requireAdminId();
    const existing = await this.blogs.findById(id);
    if (!existing) throw AppError.fromCode("ADMIN_TARGET_NOT_FOUND");
    await this.blogs.deleteById(id);
    await this.audit("ADMIN_CONTENT_DELETED", {
      contentType: "blog",
      contentId: id,
    });
    return { ok: true };
  }

  // ── Community moderation ───────────────────────────────

  async listCommunityPosts(query: PaginationQuery) {
    this.requireAdminId();
    const result = await this.community.listAllPosts(query.page, query.limit);
    return {
      items: result.items.map((p) => this.toCommunitySummary(p)),
      meta: this.meta(result.total, result.page, result.limit),
    };
  }

  async deleteCommunityPost(id: string): Promise<{ ok: true }> {
    this.requireAdminId();
    const existing = await this.community.findPostById(id);
    if (!existing) throw AppError.fromCode("ADMIN_TARGET_NOT_FOUND");
    await this.community.deleteCommentsByPost(id);
    await this.community.deleteReactionsByPost(id);
    await this.community.deletePost(id);
    await this.audit("ADMIN_CONTENT_DELETED", {
      contentType: "community_post",
      contentId: id,
    });
    return { ok: true };
  }

  async deleteCommunityComment(id: string): Promise<{ ok: true }> {
    this.requireAdminId();
    const comment = await this.community.findCommentById(id);
    if (!comment) throw AppError.fromCode("ADMIN_TARGET_NOT_FOUND");
    await this.community.deleteComment(id);
    if (comment.postId) {
      await this.community.incComments(String(comment.postId), -1);
    }
    await this.audit("ADMIN_CONTENT_DELETED", {
      contentType: "community_comment",
      contentId: id,
    });
    return { ok: true };
  }

  // ── Resources ──────────────────────────────────────────

  async listResources(query: PaginationQuery) {
    this.requireAdminId();
    const result = await this.resources.listAll(query.page, query.limit);
    return {
      items: result.items.map((r) => this.toResourceSummary(r)),
      meta: this.meta(result.total, result.page, result.limit),
    };
  }

  async deleteResource(id: string): Promise<{ ok: true }> {
    this.requireAdminId();
    const existing = await this.resources.findById(id);
    if (!existing) throw AppError.fromCode("ADMIN_TARGET_NOT_FOUND");
    await this.resources.deleteById(id);
    await this.audit("ADMIN_CONTENT_DELETED", {
      contentType: "resource",
      contentId: id,
    });
    return { ok: true };
  }

  // ── Letters (PUBLIC only) ──────────────────────────────

  async listPublicLetters(query: PaginationQuery) {
    this.requireAdminId();
    const result = await this.letters.listPublicAll(query.page, query.limit);
    return {
      items: result.items.map((l) => this.toPublicLetterSummary(l)),
      meta: this.meta(result.total, result.page, result.limit),
    };
  }

  async deletePublicLetter(id: string): Promise<{ ok: true }> {
    this.requireAdminId();
    const letter = await this.letters.findById(id);
    if (!letter) throw AppError.fromCode("ADMIN_TARGET_NOT_FOUND");

    if (letter.type === "PRIVATE") {
      // Do not reveal content — privacy wall
      throw AppError.fromCode("ADMIN_PRIVACY_VIOLATION");
    }

    await this.letters.deleteById(id);
    await this.audit("ADMIN_CONTENT_DELETED", {
      contentType: "public_letter",
      contentId: id,
    });
    return { ok: true };
  }

  /**
   * Explicit privacy denials for verification / mistaken clients.
   * Admins must never receive journal or chat message content.
   */
  denyJournalAccess(): never {
    this.requireAdminId();
    throw AppError.fromCode("ADMIN_PRIVACY_VIOLATION");
  }

  denyChatAccess(): never {
    this.requireAdminId();
    throw AppError.fromCode("ADMIN_PRIVACY_VIOLATION");
  }

  // ── Therapists (admin roster + PIN login) ───────────────

  private normalizeTherapistName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, " ");
  }

  private toTherapistDto(doc: any) {
    const created = doc.createdAt ? new Date(doc.createdAt) : new Date();
    return {
      id: String(doc._id),
      name: doc.name,
      specialty: doc.specialty || "",
      code: doc.code,
      registered: created.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      repliesCount: doc.repliesCount ?? 0,
      sessionsAttended: doc.sessionsAttended ?? 0,
      lastLogin: doc.lastLoginAt
        ? new Date(doc.lastLoginAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null,
      lastLoginAt: doc.lastLoginAt
        ? new Date(doc.lastLoginAt).toISOString()
        : null,
      createdAt: created.toISOString(),
      updatedAt: doc.updatedAt
        ? new Date(doc.updatedAt).toISOString()
        : null,
    };
  }

  async listTherapists(query: PaginationQuery) {
    this.requireAdminId();
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Therapist.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Therapist.countDocuments({}),
    ]);
    return {
      items: items.map((t) => this.toTherapistDto(t)),
      meta: this.meta(total, page, limit),
    };
  }

  async createTherapist(input: CreateTherapistInput) {
    const adminId = this.requireAdminId();
    const name = input.name.trim();
    const nameNormalized = this.normalizeTherapistName(name);
    const code = input.code;
    const specialty = (input.specialty || "").trim();

    const existingName = await Therapist.findOne({ nameNormalized }).lean();
    if (existingName) throw AppError.fromCode("THERAPIST_NAME_EXISTS");

    const existingCode = await Therapist.findOne({ code }).lean();
    if (existingCode) throw AppError.fromCode("THERAPIST_CODE_EXISTS");

    const doc = await Therapist.create({
      name,
      nameNormalized,
      specialty,
      code,
      repliesCount: 0,
      sessionsAttended: 0,
      lastLoginAt: null,
      createdBy: adminId,
    });

    await this.audit("ADMIN_USER_UPDATED", {
      field: "therapist_created",
      therapistId: String(doc._id),
      name,
    });

    return this.toTherapistDto(doc.toObject ? doc.toObject() : doc);
  }

  async updateTherapist(id: string, input: UpdateTherapistInput) {
    this.requireAdminId();
    const existing = await Therapist.findById(id).lean();
    if (!existing) throw AppError.fromCode("THERAPIST_NOT_FOUND");

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      const nameNormalized = this.normalizeTherapistName(name);
      const clash = await Therapist.findOne({
        nameNormalized,
        _id: { $ne: id },
      }).lean();
      if (clash) throw AppError.fromCode("THERAPIST_NAME_EXISTS");
      patch.name = name;
      patch.nameNormalized = nameNormalized;
    }
    if (input.specialty !== undefined) patch.specialty = input.specialty.trim();
    if (input.code !== undefined) {
      const clash = await Therapist.findOne({
        code: input.code,
        _id: { $ne: id },
      }).lean();
      if (clash) throw AppError.fromCode("THERAPIST_CODE_EXISTS");
      patch.code = input.code;
    }
    if (input.repliesCount !== undefined) patch.repliesCount = input.repliesCount;
    if (input.sessionsAttended !== undefined) {
      patch.sessionsAttended = input.sessionsAttended;
    }

    const updated = await Therapist.findByIdAndUpdate(id, patch, {
      new: true,
    }).lean();
    if (!updated) throw AppError.fromCode("THERAPIST_NOT_FOUND");
    return this.toTherapistDto(updated);
  }

  async deleteTherapist(id: string): Promise<{ ok: true }> {
    this.requireAdminId();
    const existing = await Therapist.findById(id).lean();
    if (!existing) throw AppError.fromCode("THERAPIST_NOT_FOUND");
    await Therapist.findByIdAndDelete(id);
    await this.audit("ADMIN_CONTENT_DELETED", {
      contentType: "therapist",
      contentId: id,
    });
    return { ok: true };
  }

  /**
   * Therapist gate login (name + 4-digit code).
   * Public — no admin JWT. Updates lastLoginAt on success.
   */
  async verifyTherapist(input: VerifyTherapistInput) {
    const nameNormalized = this.normalizeTherapistName(input.name);
    const doc = await Therapist.findOne({
      nameNormalized,
      code: input.code,
    }).lean();
    if (!doc) throw AppError.fromCode("THERAPIST_INVALID_CREDENTIALS");

    const updated = await Therapist.findByIdAndUpdate(
      doc._id,
      { lastLoginAt: new Date() },
      { new: true },
    ).lean();

    return this.toTherapistDto(updated || doc);
  }

  // ── mappers (summaries only — no private body dumps beyond public content) ──

  private toUserDto(doc: any): AdminUserDto {
    return {
      id: String(doc._id),
      username: doc.username,
      usernameSlug: doc.usernameSlug,
      role: doc.role?.name ?? null,
      status: (doc.status as UserStatus) || "ACTIVE",
      failedLoginAttempts: doc.failedLoginAttempts ?? 0,
      lockUntil: doc.lockUntil ? new Date(doc.lockUntil).toISOString() : null,
      createdAt: doc.createdAt
        ? new Date(doc.createdAt).toISOString()
        : new Date(0).toISOString(),
      updatedAt: doc.updatedAt
        ? new Date(doc.updatedAt).toISOString()
        : null,
    };
  }

  private toBlogSummary(doc: any) {
    return {
      id: String(doc._id),
      authorId: doc.authorId,
      title: doc.title,
      slug: doc.slug,
      status: doc.status,
      // Full fields so Admin can edit without a second fetch (same remote DB)
      excerpt: typeof doc.excerpt === "string" ? doc.excerpt : "",
      content: typeof doc.content === "string" ? doc.content : "",
      coverImage: doc.coverImage ?? null,
      tags: Array.isArray(doc.tags) ? doc.tags : [],
      publishedAt: doc.publishedAt
        ? new Date(doc.publishedAt).toISOString()
        : null,
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
    };
  }

  private toCommunitySummary(doc: any) {
    return {
      id: String(doc._id),
      authorId: doc.authorId,
      /** Truncated for list moderation UI — not full private dump */
      contentPreview:
        typeof doc.content === "string"
          ? doc.content.slice(0, 200)
          : "",
      visibility: doc.visibility,
      commentsCount: doc.commentsCount ?? 0,
      reactionsCount: doc.reactionsCount ?? 0,
      createdAt: new Date(doc.createdAt).toISOString(),
    };
  }

  private toResourceSummary(doc: any) {
    return {
      id: String(doc._id),
      authorId: doc.authorId,
      title: doc.title,
      slug: doc.slug,
      category: doc.category,
      status: doc.status,
      featured: !!doc.featured,
      // Full payload for Admin therapy lists (same remote DB)
      summary: typeof doc.summary === "string" ? doc.summary : "",
      content: typeof doc.content === "string" ? doc.content : "",
      tags: Array.isArray(doc.tags) ? doc.tags : [],
      coverImage: doc.coverImage ?? null,
      createdAt: new Date(doc.createdAt).toISOString(),
    };
  }

  private toPublicLetterSummary(doc: any) {
    return {
      id: String(doc._id),
      senderId: doc.senderId,
      type: doc.type,
      title: doc.title,
      status: doc.status,
      mood: doc.mood,
      // PUBLIC letters only — body is intentionally public content
      content: typeof doc.content === "string" ? doc.content : "",
      createdAt: new Date(doc.createdAt).toISOString(),
    };
  }
}

