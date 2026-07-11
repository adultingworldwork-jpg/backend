import { Journal, JournalMood } from "./journal.model";

export type JournalAttachment = { uploadId?: string; url: string };

export class JournalRepository {
  async create(data: {
    ownerId: string;
    title: string;
    content: string;
    mood: JournalMood;
    tags: string[];
    attachments: JournalAttachment[];
  }) {
    return Journal.create(data);
  }

  /**
   * Always query by ownerId — never fetch by id alone for authorization paths.
   */
  async findByIdForOwner(id: string, ownerId: string) {
    return Journal.findOne({ _id: id, ownerId }).lean();
  }

  async updateForOwner(
    id: string,
    ownerId: string,
    patch: Record<string, unknown>,
  ) {
    return Journal.findOneAndUpdate(
      { _id: id, ownerId },
      { $set: patch },
      { new: true },
    ).lean();
  }

  async deleteForOwner(id: string, ownerId: string) {
    return Journal.findOneAndDelete({ _id: id, ownerId }).lean();
  }

  async listForOwner(
    ownerId: string,
    filter: {
      mood?: JournalMood;
      tag?: string;
      from?: Date;
      to?: Date;
    },
    page: number,
    limit: number,
  ) {
    const q: Record<string, unknown> = { ownerId };

    if (filter.mood) q.mood = filter.mood;
    if (filter.tag) q.tags = filter.tag;

    if (filter.from || filter.to) {
      const createdAt: Record<string, Date> = {};
      if (filter.from) createdAt.$gte = filter.from;
      if (filter.to) createdAt.$lte = filter.to;
      q.createdAt = createdAt;
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Journal.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Journal.countDocuments(q),
    ]);

    return { items, total, page, limit };
  }

  /** Aggregate count only — never expose content to admins. */
  async countAll() {
    return Journal.countDocuments({});
  }
}
