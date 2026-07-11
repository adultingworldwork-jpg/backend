import { RequestContext } from "@/types/request-context";
import { SecurityAuditLogger } from "@/core/interfaces/security-audit";
import { AppError } from "@/utils/app-error";
import { slugify, normalizeTags } from "@/utils/slug";
import { UploadRepository } from "@/modules/upload/upload.repository";
import { ResourceStatus } from "./resources.model";
import { ResourcesRepository } from "./resources.repository";
import {
  CreateResourceInput,
  ResourceListQuery,
  UpdateResourceInput,
} from "./resources.schema";

export type ResourceDto = {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  coverImage: string | null;
  estimatedReadMinutes: number;
  featured: boolean;
  status: ResourceStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
};

export type PaginatedResources = {
  items: ResourceDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type ResourcesServiceDeps = {
  ctx?: RequestContext;
  audit: SecurityAuditLogger;
};

export class ResourcesService {
  private repo = new ResourcesRepository();
  private uploads = new UploadRepository();

  constructor(private deps: ResourcesServiceDeps) {}

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

  async createResource(input: CreateResourceInput): Promise<ResourceDto> {
    const authorId = this.requireUserId();
    const tags = normalizeTags(input.tags);
    const coverImage = await this.resolveCover(
      authorId,
      input.coverImage ?? null,
      input.coverUploadId,
    );
    const status: ResourceStatus = input.status ?? "DRAFT";
    const slug = await this.uniqueSlug(input.title);
    const publishedAt = status === "PUBLISHED" ? new Date() : null;

    const doc = await this.repo.create({
      authorId,
      title: input.title.trim(),
      slug,
      summary: input.summary ?? "",
      content: input.content,
      category: input.category.trim(),
      tags,
      coverImage,
      estimatedReadMinutes: input.estimatedReadMinutes ?? 5,
      featured: input.featured ?? false,
      status,
      publishedAt,
    });

    await this.deps.audit.log({
      type: "RESOURCE_CREATED",
      ...this.auditBase(),
      userId: authorId,
      metadata: {
        resourceId: String(doc._id),
        status,
        slug,
        category: input.category.trim(),
      },
    });

    if (status === "PUBLISHED") {
      await this.deps.audit.log({
        type: "RESOURCE_PUBLISHED",
        ...this.auditBase(),
        userId: authorId,
        metadata: { resourceId: String(doc._id), slug },
      });
    }

    return this.toDto(doc, true);
  }

  async updateResource(
    id: string,
    input: UpdateResourceInput,
  ): Promise<ResourceDto> {
    const userId = this.requireUserId();
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.fromCode("RESOURCE_NOT_FOUND");
    if (existing.authorId !== userId) {
      throw AppError.fromCode("RESOURCE_FORBIDDEN");
    }

    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.summary !== undefined) patch.summary = input.summary;
    if (input.content !== undefined) patch.content = input.content;
    if (input.category !== undefined) patch.category = input.category.trim();
    if (input.tags !== undefined) patch.tags = normalizeTags(input.tags);
    if (input.estimatedReadMinutes !== undefined) {
      patch.estimatedReadMinutes = input.estimatedReadMinutes;
    }
    if (input.featured !== undefined) patch.featured = input.featured;

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
        patch.publishedAt = existing.publishedAt || new Date();
        becomingPublished = true;
      }
    }

    if (input.title && existing.status === "DRAFT") {
      patch.slug = await this.uniqueSlug(input.title, id);
    }

    const updated = await this.repo.updateById(id, patch);
    if (!updated) throw AppError.fromCode("RESOURCE_NOT_FOUND");

    await this.deps.audit.log({
      type: "RESOURCE_UPDATED",
      ...this.auditBase(),
      userId,
      metadata: {
        resourceId: id,
        fields: Object.keys(patch).join(","),
      },
    });

    if (becomingPublished) {
      await this.deps.audit.log({
        type: "RESOURCE_PUBLISHED",
        ...this.auditBase(),
        userId,
        metadata: { resourceId: id, slug: String(updated.slug) },
      });
    }

    return this.toDto(updated, true);
  }

  async deleteResource(id: string): Promise<{ ok: true }> {
    const userId = this.requireUserId();
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.fromCode("RESOURCE_NOT_FOUND");
    if (existing.authorId !== userId) {
      throw AppError.fromCode("RESOURCE_FORBIDDEN");
    }

    await this.repo.deleteById(id);
    await this.deps.audit.log({
      type: "RESOURCE_DELETED",
      ...this.auditBase(),
      userId,
      metadata: { resourceId: id, slug: existing.slug },
    });

    return { ok: true };
  }

  async publishResource(id: string): Promise<ResourceDto> {
    return this.updateResource(id, { status: "PUBLISHED" });
  }

  async listPublished(query: ResourceListQuery): Promise<PaginatedResources> {
    const result = await this.repo.listPublished(query.page, query.limit);
    return this.toPage(result, this.ctx?.user?.id);
  }

  async listFeatured(query: ResourceListQuery): Promise<PaginatedResources> {
    const result = await this.repo.listFeatured(query.page, query.limit);
    return this.toPage(result, this.ctx?.user?.id);
  }

  async listByCategory(
    category: string,
    query: ResourceListQuery,
  ): Promise<PaginatedResources> {
    const result = await this.repo.listByCategory(
      category.trim(),
      query.page,
      query.limit,
    );
    return this.toPage(result, this.ctx?.user?.id);
  }

  async listByTag(
    tag: string,
    query: ResourceListQuery,
  ): Promise<PaginatedResources> {
    const normalized = tag.trim().toLowerCase().replace(/\s+/g, "-");
    const result = await this.repo.listByTag(
      normalized,
      query.page,
      query.limit,
    );
    return this.toPage(result, this.ctx?.user?.id);
  }

  async getResource(slug: string): Promise<ResourceDto> {
    const doc = await this.repo.findBySlug(slug);
    if (!doc) throw AppError.fromCode("RESOURCE_NOT_FOUND");

    const viewerId = this.ctx?.user?.id;
    const isOwner = Boolean(viewerId && viewerId === doc.authorId);

    if (doc.status === "DRAFT" && !isOwner) {
      throw AppError.fromCode("RESOURCE_NOT_FOUND");
    }

    return this.toDto(doc, isOwner);
  }

  async getMyResources(query: ResourceListQuery): Promise<PaginatedResources> {
    const authorId = this.requireUserId();
    const result = await this.repo.listByAuthor(
      authorId,
      query.page,
      query.limit,
    );
    return this.toPage(result, authorId);
  }

  private async uniqueSlug(title: string, excludeId?: string): Promise<string> {
    const base = slugify(title);
    let candidate = base;
    let n = 2;
    while (await this.repo.slugExists(candidate, excludeId)) {
      candidate = `${base}-${n}`;
      n += 1;
      if (n > 1000) throw AppError.fromCode("RESOURCE_SLUG_EXISTS");
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
    result: { items: any[]; total: number; page: number; limit: number },
    viewerId?: string,
  ): PaginatedResources {
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

  private toDto(doc: any, isOwner: boolean): ResourceDto {
    return {
      id: String(doc._id),
      authorId: doc.authorId,
      title: doc.title,
      slug: doc.slug,
      summary: doc.summary ?? "",
      content: doc.content,
      category: doc.category,
      tags: doc.tags ?? [],
      coverImage: doc.coverImage ?? null,
      estimatedReadMinutes: doc.estimatedReadMinutes ?? 5,
      featured: Boolean(doc.featured),
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
