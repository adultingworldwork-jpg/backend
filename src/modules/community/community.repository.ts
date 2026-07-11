import {
  CommunityComment,
  CommunityPost,
  CommunityReaction,
  CommunityVisibility,
  ReactionType,
} from "./community.model";

export type AttachmentDoc = { uploadId?: string; url: string };

export class CommunityRepository {
  // ── Posts ──────────────────────────────────────────────

  async createPost(data: {
    authorId: string;
    content: string;
    attachments: AttachmentDoc[];
    visibility: CommunityVisibility;
  }) {
    return CommunityPost.create({
      ...data,
      commentsCount: 0,
      reactionsCount: 0,
    });
  }

  async findPostById(id: string) {
    return CommunityPost.findById(id).lean();
  }

  async updatePost(id: string, patch: Record<string, unknown>) {
    return CommunityPost.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true },
    ).lean();
  }

  async deletePost(id: string) {
    return CommunityPost.findByIdAndDelete(id).lean();
  }

  async listPosts(filter: Record<string, unknown>, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      CommunityPost.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CommunityPost.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async incComments(postId: string, delta: number) {
    return CommunityPost.findByIdAndUpdate(
      postId,
      { $inc: { commentsCount: delta } },
      { new: true },
    ).lean();
  }

  async incReactions(postId: string, delta: number) {
    return CommunityPost.findByIdAndUpdate(
      postId,
      { $inc: { reactionsCount: delta } },
      { new: true },
    ).lean();
  }

  // ── Comments ───────────────────────────────────────────

  async createComment(data: {
    postId: string;
    authorId: string;
    content: string;
  }) {
    return CommunityComment.create(data);
  }

  async findCommentById(id: string) {
    return CommunityComment.findById(id).lean();
  }

  async updateComment(id: string, content: string) {
    return CommunityComment.findByIdAndUpdate(
      id,
      { $set: { content } },
      { new: true },
    ).lean();
  }

  async deleteComment(id: string) {
    return CommunityComment.findByIdAndDelete(id).lean();
  }

  async listComments(postId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const filter = { postId };
    const [items, total] = await Promise.all([
      CommunityComment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CommunityComment.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async deleteCommentsByPost(postId: string) {
    return CommunityComment.deleteMany({ postId });
  }

  // ── Reactions ──────────────────────────────────────────

  async findReaction(postId: string, userId: string) {
    return CommunityReaction.findOne({ postId, userId }).lean();
  }

  async upsertReaction(postId: string, userId: string, type: ReactionType) {
    return CommunityReaction.findOneAndUpdate(
      { postId, userId },
      { $set: { type }, $setOnInsert: { postId, userId } },
      { upsert: true, new: true },
    ).lean();
  }

  async deleteReaction(postId: string, userId: string) {
    return CommunityReaction.findOneAndDelete({ postId, userId }).lean();
  }

  async deleteReactionsByPost(postId: string) {
    return CommunityReaction.deleteMany({ postId });
  }

  async countReactions(postId: string) {
    return CommunityReaction.countDocuments({ postId });
  }

  async countPosts() {
    return CommunityPost.countDocuments({});
  }

  async countComments() {
    return CommunityComment.countDocuments({});
  }

  async listAllPosts(page: number, limit: number) {
    return this.listPosts({}, page, limit);
  }
}
