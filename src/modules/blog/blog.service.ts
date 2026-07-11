import { RequestContext } from "@/types/request-context";
import { SecurityAuditLogger } from "@/core/interfaces/security-audit";
import { AppError } from "@/utils/app-error";
import { slugify, normalizeTags } from "@/utils/slug";
import { UploadRepository } from "@/modules/upload/upload.repository";
import { BlogRepository } from "./blog.repository";
import { BlogStatus } from "./blog.model";
import {
  BlogListQuery,
  CreateBlogInput,
  UpdateBlogInput,
} from "./blog.schema";

export type BlogDto = {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  tags: string[];
  status: BlogStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
};

export type PaginatedBlogs = {
  items: BlogDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type BlogServiceDeps = {
  ctx?: RequestContext;
  audit: SecurityAuditLogger;
};

export class BlogService {
  private repo = new BlogRepository();
  private uploads = new UploadRepository();

  constructor(private deps: BlogServiceDeps) {}

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

  async createPost(input: CreateBlogInput): Promise<BlogDto> {
    const authorId = this.requireUserId();
    const tags = normalizeTags(input.tags);
    const coverImage = await this.resolveCover(
      authorId,
      input.coverImage ?? null,
      input.coverUploadId,
    );

    const status: BlogStatus = input.status ?? "DRAFT";
    const slug = await this.uniqueSlug(input.title);
    const publishedAt = status === "PUBLISHED" ? new Date() : null;

    const doc = await this.repo.create({
      authorId,
      title: input.title.trim(),
      slug,
      excerpt: input.excerpt ?? "",
      content: input.content,
      coverImage,
      tags,
      status,
      publishedAt,
    });

    await this.deps.audit.log({
      type: "BLOG_CREATED",
      ...this.auditBase(),
      userId: authorId,
      metadata: {
        blogId: String(doc._id),
        status,
        slug,
      },
    });

    if (status === "PUBLISHED") {
      await this.deps.audit.log({
        type: "BLOG_PUBLISHED",
        ...this.auditBase(),
        userId: authorId,
        metadata: { blogId: String(doc._id), slug },
      });
    }

    return this.toDto(doc, true);
  }

  async updatePost(id: string, input: UpdateBlogInput): Promise<BlogDto> {
    const userId = this.requireUserId();
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.fromCode("BLOG_NOT_FOUND");
    if (existing.authorId !== userId) {
      throw AppError.fromCode("BLOG_FORBIDDEN");
    }

    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.content !== undefined) patch.content = input.content;
    if (input.excerpt !== undefined) patch.excerpt = input.excerpt;
    if (input.tags !== undefined) patch.tags = normalizeTags(input.tags);

    if (input.coverImage !== undefined || input.coverUploadId) {
      patch.coverImage = await this.resolveCover(
        userId,
        input.coverImage === undefined
          ? (existing.coverImage as string | null)
          : input.coverImage,
        input.coverUploadId,
      );
    }

    const wasPublished = existing.status === "PUBLISHED";
    let becomingPublished = false;

    if (input.status !== undefined) {
      patch.status = input.status;
      if (input.status === "PUBLISHED" && !wasPublished) {
        patch.publishedAt = new Date();
        becomingPublished = true;
      }
      if (input.status === "DRAFT" && wasPublished) {
        // Keep original publishedAt for history; status alone hides it
      }
    }

    // Optionally refresh slug if title changes and still draft
    if (input.title && existing.status === "DRAFT") {
      patch.slug = await this.uniqueSlug(input.title, id);
    }

    const updated = await this.repo.updateById(id, patch);
    if (!updated) throw AppError.fromCode("BLOG_NOT_FOUND");

    await this.deps.audit.log({
      type: "BLOG_UPDATED",
      ...this.auditBase(),
      userId,
      metadata: {
        blogId: id,
        fields: Object.keys(patch).join(","),
      },
    });

    if (becomingPublished) {
      await this.deps.audit.log({
        type: "BLOG_PUBLISHED",
        ...this.auditBase(),
        userId,
        metadata: { blogId: id, slug: String(updated.slug) },
      });
    }

    return this.toDto(updated, true);
  }

  /**
   * Explicit publish helper (status → PUBLISHED).
   */
  async publishPost(id: string): Promise<BlogDto> {
    return this.updatePost(id, { status: "PUBLISHED" });
  }

  async deletePost(id: string): Promise<{ ok: true }> {
    const userId = this.requireUserId();
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.fromCode("BLOG_NOT_FOUND");
    if (existing.authorId !== userId) {
      throw AppError.fromCode("BLOG_FORBIDDEN");
    }

    await this.repo.deleteById(id);

    await this.deps.audit.log({
      type: "BLOG_DELETED",
      ...this.auditBase(),
      userId,
      metadata: { blogId: id, slug: existing.slug },
    });

    return { ok: true };
  }

  /** Public slug lookup — drafts only for owner */
  async getPost(slug: string): Promise<BlogDto> {
    const doc = await this.repo.findBySlug(slug);
    if (!doc) throw AppError.fromCode("BLOG_NOT_FOUND");

    const viewerId = this.ctx?.user?.id;
    const isOwner = Boolean(viewerId && viewerId === doc.authorId);

    if (doc.status === "DRAFT" && !isOwner) {
      // Hide existence of drafts from non-owners
      throw AppError.fromCode("BLOG_NOT_FOUND");
    }

    return this.toDto(doc, isOwner);
  }

  async getPublished(query: BlogListQuery): Promise<PaginatedBlogs> {
    const { page, limit } = query;
    const result = await this.repo.findPublished(page, limit);
    return this.toPage(result, this.ctx?.user?.id);
  }

  async getMyPosts(query: BlogListQuery): Promise<PaginatedBlogs> {
    const authorId = this.requireUserId();
    const result = await this.repo.findByAuthor(authorId, query.page, query.limit);
    return this.toPage(result, authorId);
  }

  async getByTag(tag: string, query: BlogListQuery): Promise<PaginatedBlogs> {
    const normalized = tag.trim().toLowerCase().replace(/\s+/g, "-");
    const result = await this.repo.findPublishedByTag(
      normalized,
      query.page,
      query.limit,
    );
    return this.toPage(result, this.ctx?.user?.id);
  }

  private async uniqueSlug(title: string, excludeId?: string): Promise<string> {
    const base = slugify(title);
    let candidate = base;
    let n = 2;
    while (await this.repo.slugExists(candidate, excludeId)) {
      candidate = `${base}-${n}`;
      n += 1;
      if (n > 1000) {
        throw AppError.fromCode("BLOG_SLUG_EXISTS");
      }
    }
    return candidate;
  }

  private async resolveCover(
    userId: string,
    coverImage: string | null | undefined,
    coverUploadId?: string,
  ): Promise<string | null> {
    if (coverUploadId) {
      const upload = await this.uploads.findById(coverUploadId);
      if (!upload) throw AppError.fromCode("UPLOAD_NOT_FOUND");
      if (upload.ownerId && upload.ownerId !== userId) {
        throw AppError.fromCode("FORBIDDEN", "Upload does not belong to you");
      }
      return upload.url;
    }
    if (coverImage === undefined) return null;
    return coverImage;
  }

  private toPage(
    result: {
      items: any[];
      total: number;
      page: number;
      limit: number;
    },
    viewerId?: string,
  ): PaginatedBlogs {
    return {
      items: result.items.map((doc) =>
        this.toDto(doc, Boolean(viewerId && viewerId === doc.authorId)),
      ),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.max(1, Math.ceil(result.total / result.limit) || 1),
      },
    };
  }

  private toDto(doc: any, isOwner: boolean): BlogDto {
    return {
      id: String(doc._id),
      authorId: doc.authorId,
      title: doc.title,
      slug: doc.slug,
      excerpt: doc.excerpt ?? "",
      content: doc.content,
      coverImage: doc.coverImage ?? null,
      tags: doc.tags ?? [],
      status: doc.status,
      publishedAt: doc.publishedAt
        ? new Date(doc.publishedAt).toISOString()
        : null,
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
      isOwner,
    };
  }
}
