"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const app_error_1 = require("../../utils/app-error");
const user_repository_1 = require("../../modules/user/user.repository");
const profile_repository_1 = require("../../modules/profile/profile.repository");
const blog_repository_1 = require("../../modules/blog/blog.repository");
const community_repository_1 = require("../../modules/community/community.repository");
const journal_repository_1 = require("../../modules/journal/journal.repository");
const letters_repository_1 = require("../../modules/letters/letters.repository");
const resources_repository_1 = require("../../modules/resources/resources.repository");
const chat_model_1 = require("../../modules/chat/chat.model");
/**
 * Admin orchestration layer — reuses repositories; does not reimplement domain rules.
 * Privacy: never exposes journals, private letters, or chat message content.
 */
class AdminService {
    constructor(deps) {
        this.deps = deps;
        this.users = new user_repository_1.UserRepository();
        this.profiles = new profile_repository_1.ProfileRepository();
        this.blogs = new blog_repository_1.BlogRepository();
        this.community = new community_repository_1.CommunityRepository();
        this.journals = new journal_repository_1.JournalRepository();
        this.letters = new letters_repository_1.LettersRepository();
        this.resources = new resources_repository_1.ResourcesRepository();
    }
    get ctx() {
        return this.deps.ctx;
    }
    requireAdminId() {
        const id = this.ctx?.user?.id;
        const role = (this.ctx?.user?.role || "").toLowerCase();
        const perms = this.ctx?.user?.permissions || [];
        if (!id)
            throw app_error_1.AppError.fromCode("UNAUTHORIZED");
        if (role !== "admin" && !perms.includes("admin.access")) {
            throw app_error_1.AppError.fromCode("ADMIN_REQUIRED");
        }
        return id;
    }
    audit(type, metadata) {
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
    meta(total, page, limit) {
        return {
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit) || 1),
        };
    }
    // ── Dashboard ──────────────────────────────────────────
    async getDashboard() {
        this.requireAdminId();
        const [totalUsers, activeUsers, profiles, blogPosts, communityPosts, comments, journalsCount, lettersCount, therapyResources, conversationsCount, messagesCount,] = await Promise.all([
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
            chat_model_1.Conversation.countDocuments({}),
            chat_model_1.Message.countDocuments({}),
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
    async listUsers(query) {
        this.requireAdminId();
        const result = await this.users.listUsers(query.page, query.limit);
        return {
            items: result.items.map((u) => this.toUserDto(u)),
            meta: this.meta(result.total, result.page, result.limit),
        };
    }
    async getUser(id) {
        this.requireAdminId();
        const user = await this.users.findByIdWithRole(id);
        if (!user)
            throw app_error_1.AppError.fromCode("USER_NOT_FOUND");
        return this.toUserDto(user);
    }
    async updateUserStatus(id, input) {
        this.requireAdminId();
        const existing = await this.users.findByIdWithRole(id);
        if (!existing)
            throw app_error_1.AppError.fromCode("USER_NOT_FOUND");
        const updated = await this.users.updateStatus(id, input.status);
        if (!updated)
            throw app_error_1.AppError.fromCode("USER_NOT_FOUND");
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
    async updateUserRole(id, input) {
        const adminId = this.requireAdminId();
        if (id === adminId) {
            throw app_error_1.AppError.fromCode("ADMIN_CANNOT_MODIFY_SELF");
        }
        const existing = await this.users.findByIdWithRole(id);
        if (!existing)
            throw app_error_1.AppError.fromCode("USER_NOT_FOUND");
        const roleName = input.role === "ADMIN" ? "admin" : "user";
        const roleDoc = await this.users.findRoleByName(roleName);
        if (!roleDoc) {
            throw app_error_1.AppError.fromCode("ADMIN_INVALID_ROLE", `Role "${roleName}" is not seeded`);
        }
        const updated = await this.users.updateRole(id, String(roleDoc._id));
        if (!updated)
            throw app_error_1.AppError.fromCode("USER_NOT_FOUND");
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
    async listBlogs(query) {
        this.requireAdminId();
        const result = await this.blogs.listAll(query.page, query.limit);
        return {
            items: result.items.map((b) => this.toBlogSummary(b)),
            meta: this.meta(result.total, result.page, result.limit),
        };
    }
    async deleteBlog(id) {
        this.requireAdminId();
        const existing = await this.blogs.findById(id);
        if (!existing)
            throw app_error_1.AppError.fromCode("ADMIN_TARGET_NOT_FOUND");
        await this.blogs.deleteById(id);
        await this.audit("ADMIN_CONTENT_DELETED", {
            contentType: "blog",
            contentId: id,
        });
        return { ok: true };
    }
    // ── Community moderation ───────────────────────────────
    async listCommunityPosts(query) {
        this.requireAdminId();
        const result = await this.community.listAllPosts(query.page, query.limit);
        return {
            items: result.items.map((p) => this.toCommunitySummary(p)),
            meta: this.meta(result.total, result.page, result.limit),
        };
    }
    async deleteCommunityPost(id) {
        this.requireAdminId();
        const existing = await this.community.findPostById(id);
        if (!existing)
            throw app_error_1.AppError.fromCode("ADMIN_TARGET_NOT_FOUND");
        await this.community.deleteCommentsByPost(id);
        await this.community.deleteReactionsByPost(id);
        await this.community.deletePost(id);
        await this.audit("ADMIN_CONTENT_DELETED", {
            contentType: "community_post",
            contentId: id,
        });
        return { ok: true };
    }
    async deleteCommunityComment(id) {
        this.requireAdminId();
        const comment = await this.community.findCommentById(id);
        if (!comment)
            throw app_error_1.AppError.fromCode("ADMIN_TARGET_NOT_FOUND");
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
    async listResources(query) {
        this.requireAdminId();
        const result = await this.resources.listAll(query.page, query.limit);
        return {
            items: result.items.map((r) => this.toResourceSummary(r)),
            meta: this.meta(result.total, result.page, result.limit),
        };
    }
    async deleteResource(id) {
        this.requireAdminId();
        const existing = await this.resources.findById(id);
        if (!existing)
            throw app_error_1.AppError.fromCode("ADMIN_TARGET_NOT_FOUND");
        await this.resources.deleteById(id);
        await this.audit("ADMIN_CONTENT_DELETED", {
            contentType: "resource",
            contentId: id,
        });
        return { ok: true };
    }
    // ── Letters (PUBLIC only) ──────────────────────────────
    async listPublicLetters(query) {
        this.requireAdminId();
        const result = await this.letters.listPublicAll(query.page, query.limit);
        return {
            items: result.items.map((l) => this.toPublicLetterSummary(l)),
            meta: this.meta(result.total, result.page, result.limit),
        };
    }
    async deletePublicLetter(id) {
        this.requireAdminId();
        const letter = await this.letters.findById(id);
        if (!letter)
            throw app_error_1.AppError.fromCode("ADMIN_TARGET_NOT_FOUND");
        if (letter.type === "PRIVATE") {
            // Do not reveal content — privacy wall
            throw app_error_1.AppError.fromCode("ADMIN_PRIVACY_VIOLATION");
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
    denyJournalAccess() {
        this.requireAdminId();
        throw app_error_1.AppError.fromCode("ADMIN_PRIVACY_VIOLATION");
    }
    denyChatAccess() {
        this.requireAdminId();
        throw app_error_1.AppError.fromCode("ADMIN_PRIVACY_VIOLATION");
    }
    // ── mappers (summaries only — no private body dumps beyond public content) ──
    toUserDto(doc) {
        return {
            id: String(doc._id),
            username: doc.username,
            usernameSlug: doc.usernameSlug,
            role: doc.role?.name ?? null,
            status: doc.status || "ACTIVE",
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
    toBlogSummary(doc) {
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
    toCommunitySummary(doc) {
        return {
            id: String(doc._id),
            authorId: doc.authorId,
            /** Truncated for list moderation UI — not full private dump */
            contentPreview: typeof doc.content === "string"
                ? doc.content.slice(0, 200)
                : "",
            visibility: doc.visibility,
            commentsCount: doc.commentsCount ?? 0,
            reactionsCount: doc.reactionsCount ?? 0,
            createdAt: new Date(doc.createdAt).toISOString(),
        };
    }
    toResourceSummary(doc) {
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
    toPublicLetterSummary(doc) {
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
exports.AdminService = AdminService;
