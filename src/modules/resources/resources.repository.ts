import { Resource, ResourceStatus } from "./resources.model";

export class ResourcesRepository {
  async create(data: {
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
    publishedAt: Date | null;
  }) {
    return Resource.create(data);
  }

  async findById(id: string) {
    return Resource.findById(id).lean();
  }

  async findBySlug(slug: string) {
    return Resource.findOne({ slug }).lean();
  }

  async slugExists(slug: string, excludeId?: string) {
    const q: Record<string, unknown> = { slug };
    if (excludeId) q._id = { $ne: excludeId };
    const found = await Resource.findOne(q).select("_id").lean();
    return Boolean(found);
  }

  async updateById(id: string, patch: Record<string, unknown>) {
    return Resource.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
  }

  async deleteById(id: string) {
    return Resource.findByIdAndDelete(id).lean();
  }

  async listPublished(page: number, limit: number) {
    return this.paginate(
      { status: "PUBLISHED" },
      page,
      limit,
      { publishedAt: -1, createdAt: -1 },
    );
  }

  async listFeatured(page: number, limit: number) {
    return this.paginate(
      { status: "PUBLISHED", featured: true },
      page,
      limit,
      { publishedAt: -1, createdAt: -1 },
    );
  }

  async listByCategory(category: string, page: number, limit: number) {
    // Case-insensitive category match via normalized storage or regex
    return this.paginate(
      {
        status: "PUBLISHED",
        category: new RegExp(`^${escapeRegex(category)}$`, "i"),
      },
      page,
      limit,
      { publishedAt: -1, createdAt: -1 },
    );
  }

  async listByTag(tag: string, page: number, limit: number) {
    return this.paginate(
      { status: "PUBLISHED", tags: tag },
      page,
      limit,
      { publishedAt: -1, createdAt: -1 },
    );
  }

  async listByAuthor(authorId: string, page: number, limit: number) {
    return this.paginate(
      { authorId },
      page,
      limit,
      { updatedAt: -1 },
    );
  }

  async countAll() {
    return Resource.countDocuments({});
  }

  async listAll(page: number, limit: number) {
    return this.paginate({}, page, limit, { createdAt: -1 });
  }

  private async paginate(
    filter: Record<string, unknown>,
    page: number,
    limit: number,
    sort: Record<string, 1 | -1>,
  ) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Resource.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Resource.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
