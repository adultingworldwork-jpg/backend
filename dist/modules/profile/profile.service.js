"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
const app_error_1 = require("../../utils/app-error");
const user_repository_1 = require("../../modules/user/user.repository");
const upload_repository_1 = require("../../modules/upload/upload.repository");
const upload_service_1 = require("../../modules/upload/upload.service");
const username_1 = require("../../utils/username");
const profile_repository_1 = require("./profile.repository");
class ProfileService {
    constructor(deps) {
        this.deps = deps;
        this.repo = new profile_repository_1.ProfileRepository();
        this.users = new user_repository_1.UserRepository();
        this.uploads = new upload_repository_1.UploadRepository();
    }
    get ctx() {
        return this.deps.ctx;
    }
    auditBase() {
        return {
            requestId: this.ctx?.requestId,
            ip: this.ctx?.ip,
            userAgent: this.ctx?.userAgent,
            userId: this.ctx?.user?.id,
            username: this.ctx?.user?.username,
        };
    }
    /**
     * Called from Auth registration — creates default COMMUNITY profile.
     * Used inside transaction/compensation flow.
     */
    async createForNewUser(input) {
        if (input.session) {
            await this.repo.createWithSession({
                userId: input.userId,
                displayName: input.displayName,
                bio: "",
                visibility: "COMMUNITY",
            }, input.session);
        }
        else {
            await this.repo.create({
                userId: input.userId,
                displayName: input.displayName,
                bio: "",
                visibility: "COMMUNITY",
            });
        }
        // Avoid double-audit when called under auth request context without user yet
        await this.deps.audit.log({
            type: "PROFILE_CREATED",
            requestId: this.ctx?.requestId,
            ip: this.ctx?.ip,
            userAgent: this.ctx?.userAgent,
            userId: input.userId,
            metadata: { visibility: "COMMUNITY", displayNameSet: true },
        });
    }
    async deleteByUserId(userId) {
        await this.repo.deleteByUserId(userId);
    }
    async getMyProfile() {
        const userId = this.requireUserId();
        const profile = await this.repo.findByUserId(userId);
        if (!profile) {
            throw app_error_1.AppError.fromCode("PROFILE_NOT_FOUND");
        }
        const user = await this.users.findById(userId);
        return this.toDto(profile, {
            isOwner: true,
            username: user?.username,
        });
    }
    async updateProfile(input) {
        const userId = this.requireUserId();
        const existing = await this.repo.findByUserId(userId);
        if (!existing) {
            throw app_error_1.AppError.fromCode("PROFILE_NOT_FOUND");
        }
        const patch = {};
        if (input.displayName !== undefined)
            patch.displayName = input.displayName;
        if (input.bio !== undefined)
            patch.bio = input.bio;
        if (input.pronouns !== undefined)
            patch.pronouns = input.pronouns;
        if (input.location !== undefined)
            patch.location = input.location;
        if (input.website !== undefined) {
            patch.website = input.website === "" ? "" : input.website;
        }
        if (input.dateOfBirth !== undefined) {
            patch.dateOfBirth =
                input.dateOfBirth === null || input.dateOfBirth === undefined
                    ? null
                    : new Date(input.dateOfBirth);
        }
        if (input.preferences !== undefined)
            patch.preferences = input.preferences;
        const visibilityChanged = input.visibility !== undefined &&
            input.visibility !== existing.visibility;
        if (input.visibility !== undefined) {
            patch.visibility = input.visibility;
        }
        if (Object.keys(patch).length === 0) {
            const user = await this.users.findById(userId);
            return this.toDto(existing, { isOwner: true, username: user?.username });
        }
        const updated = await this.repo.updateByUserId(userId, patch);
        if (!updated) {
            throw app_error_1.AppError.fromCode("PROFILE_NOT_FOUND");
        }
        await this.deps.audit.log({
            type: "PROFILE_UPDATED",
            ...this.auditBase(),
            userId,
            metadata: {
                fields: Object.keys(patch).join(","),
            },
        });
        if (visibilityChanged) {
            await this.deps.audit.log({
                type: "PROFILE_VISIBILITY_CHANGED",
                ...this.auditBase(),
                userId,
                metadata: {
                    from: String(existing.visibility),
                    to: String(input.visibility),
                },
            });
        }
        const user = await this.users.findById(userId);
        return this.toDto(updated, { isOwner: true, username: user?.username });
    }
    /**
     * Lookup by auth username (not displayName).
     * Applies PUBLIC / COMMUNITY / PRIVATE rules.
     */
    async getPublicProfile(username) {
        const user = await this.users.findByUsernameNormalized((0, username_1.normalizeUsername)(username));
        if (!user) {
            throw app_error_1.AppError.fromCode("PROFILE_NOT_FOUND");
        }
        const userId = String(user._id);
        const profile = await this.repo.findByUserId(userId);
        if (!profile) {
            throw app_error_1.AppError.fromCode("PROFILE_NOT_FOUND");
        }
        const viewerId = this.ctx?.user?.id;
        const isOwner = Boolean(viewerId && viewerId === userId);
        if (!this.canView(profile.visibility, isOwner, viewerId)) {
            throw app_error_1.AppError.fromCode("PROFILE_FORBIDDEN");
        }
        return this.toDto(profile, {
            isOwner,
            username: user.username,
            redactPrivateFields: !isOwner && profile.visibility === "PRIVATE",
        });
    }
    async updateAvatar(input) {
        return this.updateMediaField("avatar", input, "AVATAR_UPDATED");
    }
    async updateCover(input) {
        return this.updateMediaField("coverImage", input, "COVER_UPDATED");
    }
    /**
     * Optional: multipart path that reuses UploadService (no Cloudinary SDK here).
     */
    async updateAvatarFromFile(file) {
        return this.updateMediaFromFile("avatar", "avatar", file, "AVATAR_UPDATED");
    }
    async updateCoverFromFile(file) {
        return this.updateMediaFromFile("coverImage", "cover", file, "COVER_UPDATED");
    }
    async updateMediaFromFile(field, purpose, file, auditType) {
        if (!this.deps.app) {
            throw app_error_1.AppError.fromCode("INTERNAL_SERVER_ERROR", "App context missing for upload");
        }
        // Images only for profile media
        if (!file.mimeType.startsWith("image/")) {
            throw app_error_1.AppError.fromCode("UPLOAD_INVALID_TYPE", "Profile media must be an image");
        }
        const uploadService = new upload_service_1.UploadService(this.deps.app, this.ctx);
        const uploaded = await uploadService.uploadFile({
            buffer: file.buffer,
            filename: file.filename,
            mimeType: file.mimeType,
            purpose,
        });
        return this.updateMediaField(field, { url: uploaded.url, uploadId: uploaded.id }, auditType);
    }
    async updateMediaField(field, input, auditType) {
        const userId = this.requireUserId();
        const existing = await this.repo.findByUserId(userId);
        if (!existing) {
            throw app_error_1.AppError.fromCode("PROFILE_NOT_FOUND");
        }
        let url = input.url ?? null;
        if (input.uploadId) {
            const upload = await this.uploads.findById(input.uploadId);
            if (!upload) {
                throw app_error_1.AppError.fromCode("UPLOAD_NOT_FOUND");
            }
            if (upload.ownerId && upload.ownerId !== userId) {
                throw app_error_1.AppError.fromCode("FORBIDDEN", "Upload does not belong to you");
            }
            url = upload.url;
        }
        if (!url) {
            throw app_error_1.AppError.fromCode("VALIDATION_ERROR", "Media URL is required");
        }
        const updated = await this.repo.updateByUserId(userId, { [field]: url });
        if (!updated) {
            throw app_error_1.AppError.fromCode("PROFILE_NOT_FOUND");
        }
        await this.deps.audit.log({
            type: auditType,
            ...this.auditBase(),
            userId,
            metadata: { field },
        });
        const user = await this.users.findById(userId);
        return this.toDto(updated, { isOwner: true, username: user?.username });
    }
    /**
     * Visibility authorization — single place for ownership/viewer rules.
     */
    canView(visibility, isOwner, viewerId) {
        if (isOwner)
            return true;
        if (visibility === "PUBLIC")
            return true;
        if (visibility === "COMMUNITY")
            return Boolean(viewerId);
        // PRIVATE
        return false;
    }
    requireUserId() {
        const id = this.ctx?.user?.id;
        if (!id) {
            throw app_error_1.AppError.fromCode("UNAUTHORIZED");
        }
        return id;
    }
    toDto(doc, opts) {
        const dob = doc.dateOfBirth
            ? new Date(doc.dateOfBirth).toISOString()
            : null;
        return {
            id: String(doc._id),
            userId: doc.userId,
            username: opts.username,
            displayName: doc.displayName,
            bio: doc.bio ?? "",
            avatar: doc.avatar ?? null,
            coverImage: doc.coverImage ?? null,
            pronouns: doc.pronouns ?? "",
            location: doc.location ?? "",
            website: doc.website ?? "",
            dateOfBirth: opts.isOwner ? dob : dob, // DOB visible when profile is viewable
            visibility: doc.visibility,
            preferences: opts.isOwner ? (doc.preferences ?? {}) : {},
            createdAt: new Date(doc.createdAt).toISOString(),
            updatedAt: new Date(doc.updatedAt).toISOString(),
            isOwner: opts.isOwner,
        };
    }
}
exports.ProfileService = ProfileService;
