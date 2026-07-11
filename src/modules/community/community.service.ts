import { RequestContext } from "@/types/request-context";
import { SecurityAuditLogger } from "@/core/interfaces/security-audit";
import { AppError } from "@/utils/app-error";
import { UploadRepository } from "@/modules/upload/upload.repository";
import {
  CommunityVisibility,
  ReactionType,
} from "./community.model";
import {
  AttachmentDoc,
  CommunityRepository,
} from "./community.repository";
import {
  CommunityListQuery,
  CreateCommentInput,
  CreateCommunityPostInput,
  ReactionInput,
  UpdateCommentInput,
  UpdateCommunityPostInput,
} from "./community.schema";

export type CommunityPostDto = {
  id: string;
  authorId: string;
  content: string;
  attachments: AttachmentDoc[];
  visibility: CommunityVisibility;
  commentsCount: number;
  reactionsCount: number;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
  myReaction: ReactionType | null;
};

export type CommunityCommentDto = {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
};

export type CommunityReactionDto = {
  id: string;
  postId: string;
  userId: string;
  type: ReactionType;
  createdAt: string;
};

export type PaginatedPosts = {
  items: CommunityPostDto[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type PaginatedComments = {
  items: CommunityCommentDto[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type CommunityServiceDeps = {
  ctx?: RequestContext;
  audit: SecurityAuditLogger;
};

export class CommunityService {
  private repo = new CommunityRepository();
  private uploads = new UploadRepository();

  constructor(private deps: CommunityServiceDeps) {}

  private get ctx() {
    return this.deps.ctx;
  }

  private auditBase() {
    return {
      requestId: this.ctx?.requestId,
      ip: this.ctx?.ip,
      userAgent: this.ctx?.userAgent,
      userId: this.ctx?.user?.id,
      username: this.ctx?.user?.username,
    };
  }

  private requireUserId(): string {
    const id = this.ctx?.user?.id;
    if (!id) throw AppError.fromCode("UNAUTHORIZED");
    return id;
  }

  // ── Posts ──────────────────────────────────────────────

  async createPost(input: CreateCommunityPostInput): Promise<CommunityPostDto> {
    const authorId = this.requireUserId();
    const attachments = await this.resolveAttachments(
      authorId,
      input.attachmentUploadIds ?? [],
    );

    const doc = await this.repo.createPost({
      authorId,
      content: input.content,
      attachments,
      visibility: input.visibility ?? "COMMUNITY",
    });

    await this.deps.audit.log({
      type: "COMMUNITY_POST_CREATED",
      ...this.auditBase(),
      userId: authorId,
      metadata: {
        postId: String(doc._id),
        visibility: String(doc.visibility),
      },
    });

    return this.toPostDto(doc, authorId, null);
  }

  async updatePost(
    id: string,
    input: UpdateCommunityPostInput,
  ): Promise<CommunityPostDto> {
    const userId = this.requireUserId();
    const existing = await this.repo.findPostById(id);
    if (!existing) throw AppError.fromCode("COMMUNITY_POST_NOT_FOUND");
    if (existing.authorId !== userId) {
      throw AppError.fromCode("COMMUNITY_POST_FORBIDDEN");
    }

    const patch: Record<string, unknown> = {};
    if (input.content !== undefined) patch.content = input.content;
    if (input.visibility !== undefined) patch.visibility = input.visibility;
    if (input.attachmentUploadIds !== undefined) {
      patch.attachments = await this.resolveAttachments(
        userId,
        input.attachmentUploadIds,
      );
    }

    const updated = await this.repo.updatePost(id, patch);
    if (!updated) throw AppError.fromCode("COMMUNITY_POST_NOT_FOUND");

    await this.deps.audit.log({
      type: "COMMUNITY_POST_UPDATED",
      ...this.auditBase(),
      userId,
      metadata: {
        postId: id,
        fields: Object.keys(patch).join(","),
      },
    });

    const myReaction = await this.repo.findReaction(id, userId);
    return this.toPostDto(
      updated,
      userId,
      (myReaction?.type as ReactionType) ?? null,
    );
  }

  async deletePost(id: string): Promise<{ ok: true }> {
    const userId = this.requireUserId();
    const existing = await this.repo.findPostById(id);
    if (!existing) throw AppError.fromCode("COMMUNITY_POST_NOT_FOUND");
    if (existing.authorId !== userId) {
      throw AppError.fromCode("COMMUNITY_POST_FORBIDDEN");
    }

    await this.repo.deleteCommentsByPost(id);
    await this.repo.deleteReactionsByPost(id);
    await this.repo.deletePost(id);

    await this.deps.audit.log({
      type: "COMMUNITY_POST_DELETED",
      ...this.auditBase(),
      userId,
      metadata: { postId: id },
    });

    return { ok: true };
  }

  async listPosts(query: CommunityListQuery): Promise<PaginatedPosts> {
    const viewerId = this.ctx?.user?.id;
    const filter = viewerId
      ? {} // authenticated: PUBLIC + COMMUNITY
      : { visibility: "PUBLIC" };

    // Authenticated users see both PUBLIC and COMMUNITY
    if (viewerId) {
      // no visibility filter
    }

    const result = await this.repo.listPosts(filter, query.page, query.limit);
    const items = await Promise.all(
      result.items.map(async (doc) => {
        const isOwner = Boolean(viewerId && viewerId === doc.authorId);
        // Double-check COMMUNITY for safety if filter ever widens
        if (
          !this.canView(
            doc.visibility as CommunityVisibility,
            isOwner,
            viewerId,
          )
        ) {
          return null;
        }
        const reaction = viewerId
          ? await this.repo.findReaction(String(doc._id), viewerId)
          : null;
        return this.toPostDto(
          doc,
          viewerId,
          (reaction?.type as ReactionType) ?? null,
        );
      }),
    );

    const filtered = items.filter(Boolean) as CommunityPostDto[];
    return {
      items: filtered,
      meta: this.meta(result.total, result.page, result.limit),
    };
  }

  async getPost(id: string): Promise<CommunityPostDto> {
    const doc = await this.repo.findPostById(id);
    if (!doc) throw AppError.fromCode("COMMUNITY_POST_NOT_FOUND");

    const viewerId = this.ctx?.user?.id;
    const isOwner = Boolean(viewerId && viewerId === doc.authorId);

    if (
      !this.canView(doc.visibility as CommunityVisibility, isOwner, viewerId)
    ) {
      throw AppError.fromCode("COMMUNITY_POST_FORBIDDEN");
    }

    const reaction = viewerId
      ? await this.repo.findReaction(id, viewerId)
      : null;

    return this.toPostDto(
      doc,
      viewerId,
      (reaction?.type as ReactionType) ?? null,
    );
  }

  async getMyPosts(query: CommunityListQuery): Promise<PaginatedPosts> {
    const authorId = this.requireUserId();
    const result = await this.repo.listPosts(
      { authorId },
      query.page,
      query.limit,
    );

    const items = await Promise.all(
      result.items.map(async (doc) => {
        const reaction = await this.repo.findReaction(
          String(doc._id),
          authorId,
        );
        return this.toPostDto(
          doc,
          authorId,
          (reaction?.type as ReactionType) ?? null,
        );
      }),
    );

    return {
      items,
      meta: this.meta(result.total, result.page, result.limit),
    };
  }

  // ── Comments ───────────────────────────────────────────

  async addComment(
    postId: string,
    input: CreateCommentInput,
  ): Promise<CommunityCommentDto> {
    const authorId = this.requireUserId();
    await this.assertCanInteract(postId);

    const doc = await this.repo.createComment({
      postId,
      authorId,
      content: input.content,
    });
    await this.repo.incComments(postId, 1);

    await this.deps.audit.log({
      type: "COMMUNITY_COMMENT_CREATED",
      ...this.auditBase(),
      userId: authorId,
      metadata: { postId, commentId: String(doc._id) },
    });

    return this.toCommentDto(doc, authorId);
  }

  async updateComment(
    commentId: string,
    input: UpdateCommentInput,
  ): Promise<CommunityCommentDto> {
    const userId = this.requireUserId();
    const existing = await this.repo.findCommentById(commentId);
    if (!existing) throw AppError.fromCode("COMMUNITY_COMMENT_NOT_FOUND");
    if (existing.authorId !== userId) {
      throw AppError.fromCode("COMMUNITY_COMMENT_FORBIDDEN");
    }

    // Ensure parent post still viewable for consistency
    await this.assertCanInteract(existing.postId);

    const updated = await this.repo.updateComment(commentId, input.content);
    if (!updated) throw AppError.fromCode("COMMUNITY_COMMENT_NOT_FOUND");

    await this.deps.audit.log({
      type: "COMMUNITY_COMMENT_UPDATED",
      ...this.auditBase(),
      userId,
      metadata: { commentId, postId: existing.postId },
    });

    return this.toCommentDto(updated, userId);
  }

  async deleteComment(commentId: string): Promise<{ ok: true }> {
    const userId = this.requireUserId();
    const existing = await this.repo.findCommentById(commentId);
    if (!existing) throw AppError.fromCode("COMMUNITY_COMMENT_NOT_FOUND");
    if (existing.authorId !== userId) {
      throw AppError.fromCode("COMMUNITY_COMMENT_FORBIDDEN");
    }

    await this.repo.deleteComment(commentId);
    await this.repo.incComments(existing.postId, -1);

    // Prevent negative counters
    const post = await this.repo.findPostById(existing.postId);
    if (post && (post.commentsCount ?? 0) < 0) {
      await this.repo.updatePost(existing.postId, { commentsCount: 0 });
    }

    await this.deps.audit.log({
      type: "COMMUNITY_COMMENT_DELETED",
      ...this.auditBase(),
      userId,
      metadata: { commentId, postId: existing.postId },
    });

    return { ok: true };
  }

  async listComments(
    postId: string,
    query: CommunityListQuery,
  ): Promise<PaginatedComments> {
    // Viewing comments requires ability to view the post
    await this.getPost(postId);

    const result = await this.repo.listComments(
      postId,
      query.page,
      query.limit,
    );
    const viewerId = this.ctx?.user?.id;

    return {
      items: result.items.map((c) => this.toCommentDto(c, viewerId)),
      meta: this.meta(result.total, result.page, result.limit),
    };
  }

  // ── Reactions ──────────────────────────────────────────

  async react(
    postId: string,
    input: ReactionInput,
  ): Promise<CommunityReactionDto> {
    const userId = this.requireUserId();
    await this.assertCanInteract(postId);

    const existing = await this.repo.findReaction(postId, userId);
    const doc = await this.repo.upsertReaction(postId, userId, input.type);

    if (!existing) {
      await this.repo.incReactions(postId, 1);
    }

    await this.deps.audit.log({
      type: "COMMUNITY_REACTION_ADDED",
      ...this.auditBase(),
      userId,
      metadata: {
        postId,
        reactionType: input.type,
        updated: Boolean(existing),
      },
    });

    return this.toReactionDto(doc!);
  }

  async removeReaction(postId: string): Promise<{ ok: true }> {
    const userId = this.requireUserId();
    await this.assertCanInteract(postId);

    const existing = await this.repo.findReaction(postId, userId);
    if (!existing) {
      throw AppError.fromCode("COMMUNITY_REACTION_NOT_FOUND");
    }

    await this.repo.deleteReaction(postId, userId);
    await this.repo.incReactions(postId, -1);

    const post = await this.repo.findPostById(postId);
    if (post && (post.reactionsCount ?? 0) < 0) {
      await this.repo.updatePost(postId, { reactionsCount: 0 });
    }

    await this.deps.audit.log({
      type: "COMMUNITY_REACTION_REMOVED",
      ...this.auditBase(),
      userId,
      metadata: { postId },
    });

    return { ok: true };
  }

  // ── Visibility / helpers ───────────────────────────────

  canView(
    visibility: CommunityVisibility,
    isOwner: boolean,
    viewerId?: string,
  ): boolean {
    if (isOwner) return true;
    if (visibility === "PUBLIC") return true;
    if (visibility === "COMMUNITY") return Boolean(viewerId);
    return false;
  }

  /** Comment/react require auth + ability view rights */
  private async assertCanInteract(postId: string) {
    this.requireUserId();
    await this.getPost(postId);
  }

  private async resolveAttachments(
    userId: string,
    uploadIds: string[],
  ): Promise<AttachmentDoc[]> {
    const out: AttachmentDoc[] = [];
    for (const uploadId of uploadIds) {
      const upload = await this.uploads.findById(uploadId);
      if (!upload) throw AppError.fromCode("UPLOAD_NOT_FOUND");
      if (upload.ownerId && upload.ownerId !== userId) {
        throw AppError.fromCode("FORBIDDEN", "Upload does not belong to you");
      }
      out.push({ uploadId, url: upload.url });
    }
    return out;
  }

  private meta(total: number, page: number, limit: number) {
    return {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit) || 1),
    };
  }

  private toPostDto(
    doc: any,
    viewerId?: string,
    myReaction: ReactionType | null = null,
  ): CommunityPostDto {
    return {
      id: String(doc._id),
      authorId: doc.authorId,
      content: doc.content,
      attachments: doc.attachments ?? [],
      visibility: doc.visibility,
      commentsCount: Math.max(0, doc.commentsCount ?? 0),
      reactionsCount: Math.max(0, doc.reactionsCount ?? 0),
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
      isOwner: Boolean(viewerId && viewerId === doc.authorId),
      myReaction,
    };
  }

  private toCommentDto(doc: any, viewerId?: string): CommunityCommentDto {
    return {
      id: String(doc._id),
      postId: doc.postId,
      authorId: doc.authorId,
      content: doc.content,
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
      isOwner: Boolean(viewerId && viewerId === doc.authorId),
    };
  }

  private toReactionDto(doc: any): CommunityReactionDto {
    return {
      id: String(doc._id),
      postId: doc.postId,
      userId: doc.userId,
      type: doc.type,
      createdAt: new Date(doc.createdAt).toISOString(),
    };
  }
}
