import { Blog, BlogStatus } from "./blog.model";

export class BlogRepository {
  async create(data: {
    authorId: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    coverImage: string | null;
    tags: string[];
    status: BlogStatus;
    publishedAt: Date | null;
  }) {
    return Blog.create(data);
  }

  async findById(id: string) {
    return Blog.findById(id).lean();
  }

  async findBySlug(slug: string) {
    return Blog.findOne({ slug }).lean();
  }

  async slugExists(slug: string, excludeId?: string) {
    const q: Record<string, unknown> = { slug };
    if (excludeId) q._id = { $ne: excludeId };
    const found = await Blog.findOne(q).select("_id").lean();
    return Boolean(found);
  }

  async updateById(id: string, patch: Record<string, unknown>) {
    return Blog.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
  }

  async deleteById(id: string) {
    return Blog.findByIdAndDelete(id).lean();
  }

  async findPublished(page: number, limit: number) {
    const filter = { status: "PUBLISHED" as const };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Blog.find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Blog.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async findByAuthor(authorId: string, page: number, limit: number) {
    const filter = { authorId };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Blog.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Blog.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async findPublishedByTag(tag: string, page: number, limit: number) {
    const filter = { status: "PUBLISHED" as const, tags: tag };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Blog.find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Blog.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async countAll() {
    return Blog.countDocuments({});
  }

  async listAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Blog.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Blog.countDocuments({}),
    ]);
    return { items, total, page, limit };
  }
}
