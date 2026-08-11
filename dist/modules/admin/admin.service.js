"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
exports.therapistPasswordFromCode = therapistPasswordFromCode;
const bcrypt_1 = __importDefault(require("bcrypt"));
const app_error_1 = require("../../utils/app-error");
const user_repository_1 = require("../../modules/user/user.repository");
const profile_repository_1 = require("../../modules/profile/profile.repository");
const blog_repository_1 = require("../../modules/blog/blog.repository");
const community_repository_1 = require("../../modules/community/community.repository");
const journal_repository_1 = require("../../modules/journal/journal.repository");
const letters_repository_1 = require("../../modules/letters/letters.repository");
const resources_repository_1 = require("../../modules/resources/resources.repository");
const chat_model_1 = require("../../modules/chat/chat.model");
const auth_constants_1 = require("../../modules/auth/auth.constants");
const username_1 = require("../../utils/username");
const therapist_model_1 = require("./therapist.model");
/** Deterministic password material from 4-digit PIN (min 8 chars for auth rules). */
function therapistPasswordFromCode(code) {
    return `Therapist@${code}`;
}
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
    // ── Therapists (admin roster + PIN login) ───────────────
    normalizeTherapistName(name) {
        return name.trim().toLowerCase().replace(/\s+/g, " ");
    }
    toTherapistDto(doc) {
        const created = doc.createdAt ? new Date(doc.createdAt) : new Date();
        return {
            id: String(doc._id),
            name: doc.name,
            specialty: doc.specialty || "",
            code: doc.code,
            /** Linked platform user id — required for chat participation */
            userId: doc.userId ? String(doc.userId) : null,
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
    /**
     * Ensure a linked User exists for the therapist (role therapist).
     * Password is derived from the PIN so verify can issue JWT sessions.
     */
    async ensureTherapistUser(doc) {
        if (doc.userId) {
            const existing = await this.users.findById(String(doc.userId));
            if (existing)
                return String(doc.userId);
        }
        const therapistRole = await this.users.findRoleByName("therapist");
        if (!therapistRole) {
            throw app_error_1.AppError.fromCode("INTERNAL_SERVER_ERROR", 'Role "therapist" is missing. Run the seed script.');
        }
        // Unique username: therapist_<slug>_<shortId>
        const baseSlug = (0, username_1.slugifyUsername)(doc.name) || "therapist";
        const shortId = String(doc._id).slice(-6);
        let username = `t_${baseSlug}_${shortId}`.slice(0, 30);
        let usernameNormalized = (0, username_1.normalizeUsername)(username);
        let usernameSlug = (0, username_1.slugifyUsername)(username);
        // Collision guard (very rare)
        let attempt = 0;
        while (await this.users.findByUsernameNormalized(usernameNormalized)) {
            attempt += 1;
            username = `t_${baseSlug}_${shortId}${attempt}`.slice(0, 30);
            usernameNormalized = (0, username_1.normalizeUsername)(username);
            usernameSlug = (0, username_1.slugifyUsername)(username);
            if (attempt > 20) {
                throw app_error_1.AppError.fromCode("INTERNAL_SERVER_ERROR", "Could not allocate therapist username");
            }
        }
        const passwordHash = await bcrypt_1.default.hash(therapistPasswordFromCode(doc.code), auth_constants_1.BCRYPT_ROUNDS);
        const recoveryPassphraseHash = await bcrypt_1.default.hash((0, username_1.normalizeRecoveryPassphrase)(`therapist-recovery-${shortId}`), auth_constants_1.BCRYPT_ROUNDS);
        const created = await this.users.create({
            username,
            usernameNormalized,
            usernameSlug,
            passwordHash,
            recoveryPassphraseHash,
            roleId: String(therapistRole._id),
            acceptedTermsAt: new Date(),
        });
        const userId = String(created._id);
        // Profile for display
        try {
            const existingProfile = await this.profiles.findByUserId(userId);
            if (!existingProfile) {
                await this.profiles.create({
                    userId,
                    displayName: doc.name,
                });
            }
        }
        catch {
            /* non-fatal for chat */
        }
        await therapist_model_1.Therapist.findByIdAndUpdate(doc._id, { userId });
        return userId;
    }
    async listTherapists(query) {
        this.requireAdminId();
        const page = query.page ?? 1;
        const limit = query.limit ?? 50;
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            therapist_model_1.Therapist.find({})
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            therapist_model_1.Therapist.countDocuments({}),
        ]);
        return {
            items: items.map((t) => this.toTherapistDto(t)),
            meta: this.meta(total, page, limit),
        };
    }
    /**
     * Public roster for user Safe Space matching (no codes, no admin JWT).
     */
    async listTherapistsPublic() {
        const items = await therapist_model_1.Therapist.find({})
            .sort({ sessionsAttended: 1, createdAt: 1 })
            .limit(100)
            .lean();
        // Ensure linked users for matching (lazy backfill)
        const out = [];
        for (const t of items) {
            try {
                const userId = await this.ensureTherapistUser(t);
                out.push({
                    id: String(t._id),
                    name: t.name,
                    specialty: t.specialty || "",
                    userId,
                });
            }
            catch {
                /* skip broken rows */
            }
        }
        return { items: out };
    }
    async createTherapist(input) {
        const adminId = this.requireAdminId();
        const name = input.name.trim();
        const nameNormalized = this.normalizeTherapistName(name);
        const code = input.code;
        const specialty = (input.specialty || "").trim();
        const existingName = await therapist_model_1.Therapist.findOne({ nameNormalized }).lean();
        if (existingName)
            throw app_error_1.AppError.fromCode("THERAPIST_NAME_EXISTS");
        const existingCode = await therapist_model_1.Therapist.findOne({ code }).lean();
        if (existingCode)
            throw app_error_1.AppError.fromCode("THERAPIST_CODE_EXISTS");
        const doc = await therapist_model_1.Therapist.create({
            name,
            nameNormalized,
            specialty,
            code,
            userId: null,
            repliesCount: 0,
            sessionsAttended: 0,
            lastLoginAt: null,
            createdBy: adminId,
        });
        const plain = doc.toObject ? doc.toObject() : doc;
        const userId = await this.ensureTherapistUser(plain);
        await this.audit("ADMIN_USER_UPDATED", {
            field: "therapist_created",
            therapistId: String(doc._id),
            name,
            userId,
        });
        const refreshed = await therapist_model_1.Therapist.findById(doc._id).lean();
        return this.toTherapistDto(refreshed || { ...plain, userId });
    }
    async updateTherapist(id, input) {
        this.requireAdminId();
        const existing = await therapist_model_1.Therapist.findById(id).lean();
        if (!existing)
            throw app_error_1.AppError.fromCode("THERAPIST_NOT_FOUND");
        const patch = {};
        if (input.name !== undefined) {
            const name = input.name.trim();
            const nameNormalized = this.normalizeTherapistName(name);
            const clash = await therapist_model_1.Therapist.findOne({
                nameNormalized,
                _id: { $ne: id },
            }).lean();
            if (clash)
                throw app_error_1.AppError.fromCode("THERAPIST_NAME_EXISTS");
            patch.name = name;
            patch.nameNormalized = nameNormalized;
        }
        if (input.specialty !== undefined)
            patch.specialty = input.specialty.trim();
        if (input.code !== undefined) {
            const clash = await therapist_model_1.Therapist.findOne({
                code: input.code,
                _id: { $ne: id },
            }).lean();
            if (clash)
                throw app_error_1.AppError.fromCode("THERAPIST_CODE_EXISTS");
            patch.code = input.code;
        }
        if (input.repliesCount !== undefined)
            patch.repliesCount = input.repliesCount;
        if (input.sessionsAttended !== undefined) {
            patch.sessionsAttended = input.sessionsAttended;
        }
        const updated = await therapist_model_1.Therapist.findByIdAndUpdate(id, patch, {
            new: true,
        }).lean();
        if (!updated)
            throw app_error_1.AppError.fromCode("THERAPIST_NOT_FOUND");
        // Keep linked user password in sync when PIN changes
        if (input.code !== undefined) {
            const userId = await this.ensureTherapistUser(updated);
            const passwordHash = await bcrypt_1.default.hash(therapistPasswordFromCode(input.code), auth_constants_1.BCRYPT_ROUNDS);
            await this.users.updatePassword(userId, passwordHash);
        }
        else if (!updated.userId) {
            await this.ensureTherapistUser(updated);
        }
        const refreshed = await therapist_model_1.Therapist.findById(id).lean();
        return this.toTherapistDto(refreshed || updated);
    }
    async deleteTherapist(id) {
        this.requireAdminId();
        const existing = await therapist_model_1.Therapist.findById(id).lean();
        if (!existing)
            throw app_error_1.AppError.fromCode("THERAPIST_NOT_FOUND");
        // Suspend linked user so JWT sessions fail on next refresh/me
        if (existing.userId) {
            try {
                await this.users.updateStatus(String(existing.userId), "SUSPENDED");
            }
            catch {
                /* best-effort */
            }
        }
        await therapist_model_1.Therapist.findByIdAndDelete(id);
        await this.audit("ADMIN_CONTENT_DELETED", {
            contentType: "therapist",
            contentId: id,
        });
        return { ok: true };
    }
    /**
     * Therapist gate login (name + 4-digit code).
     * Public — no admin JWT.
     * Returns roster DTO + linked userId (tokens issued by controller via AuthService).
     */
    async verifyTherapist(input) {
        const nameNormalized = this.normalizeTherapistName(input.name);
        const doc = await therapist_model_1.Therapist.findOne({
            nameNormalized,
            code: input.code,
        }).lean();
        if (!doc)
            throw app_error_1.AppError.fromCode("THERAPIST_INVALID_CREDENTIALS");
        const userId = await this.ensureTherapistUser(doc);
        const updated = await therapist_model_1.Therapist.findByIdAndUpdate(doc._id, { lastLoginAt: new Date(), userId }, { new: true }).lean();
        return {
            therapist: this.toTherapistDto(updated || { ...doc, userId }),
            userId,
        };
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
