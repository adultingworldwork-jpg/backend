import { Letter, LetterStatus, LetterType } from "./letters.model";

export type LetterAttachment = { uploadId?: string; url: string };

export class LettersRepository {
  async create(data: {
    senderId: string;
    recipientId: string | null;
    type: LetterType;
    title: string;
    content: string;
    mood: string;
    attachments: LetterAttachment[];
    status: LetterStatus;
  }) {
    return Letter.create({
      ...data,
      deliveredAt: null,
      readAt: null,
      archivedAt: null,
    });
  }

  async findById(id: string) {
    return Letter.findById(id).lean();
  }

  async updateById(id: string, patch: Record<string, unknown>) {
    return Letter.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
  }

  async deleteById(id: string) {
    return Letter.findByIdAndDelete(id).lean();
  }

  async listSent(senderId: string, page: number, limit: number) {
    // All letters authored by sender (drafts + sent + read + archived)
    return this.paginate({ senderId }, page, limit, { createdAt: -1 });
  }

  async listInbox(recipientId: string, page: number, limit: number) {
    // Received private letters not yet archived
    const q = {
      recipientId,
      type: "PRIVATE" as const,
      status: { $in: ["SENT", "READ"] as LetterStatus[] },
    };
    return this.paginate(q, page, limit, { deliveredAt: -1, createdAt: -1 });
  }

  async listPublic(page: number, limit: number) {
    // Public feed: PUBLIC + SENT only
    return this.paginate(
      { type: "PUBLIC", status: "SENT" },
      page,
      limit,
      { deliveredAt: -1, createdAt: -1 },
    );
  }

  /** Admin moderation list: PUBLIC letters only (any status). */
  async listPublicAll(page: number, limit: number) {
    return this.paginate(
      { type: "PUBLIC" },
      page,
      limit,
      { createdAt: -1 },
    );
  }

  async countAll() {
    return Letter.countDocuments({});
  }

  private async paginate(
    filter: Record<string, unknown>,
    page: number,
    limit: number,
    sort: Record<string, 1 | -1>,
  ) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Letter.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Letter.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
}
