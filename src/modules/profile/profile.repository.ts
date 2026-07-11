import mongoose from "mongoose";
import { Profile, ProfileVisibility } from "./profile.model";

export class ProfileRepository {
  async create(data: {
    userId: string;
    displayName: string;
    bio?: string;
    visibility?: ProfileVisibility;
  }) {
    return Profile.create({
      userId: data.userId,
      displayName: data.displayName,
      bio: data.bio ?? "",
      avatar: null,
      coverImage: null,
      pronouns: "",
      location: "",
      website: "",
      dateOfBirth: null,
      visibility: data.visibility ?? "COMMUNITY",
      preferences: {},
    });
  }

  async createWithSession(
    data: {
      userId: string;
      displayName: string;
      bio?: string;
      visibility?: ProfileVisibility;
    },
    session: mongoose.ClientSession,
  ) {
    const [doc] = await Profile.create(
      [
        {
          userId: data.userId,
          displayName: data.displayName,
          bio: data.bio ?? "",
          avatar: null,
          coverImage: null,
          pronouns: "",
          location: "",
          website: "",
          dateOfBirth: null,
          visibility: data.visibility ?? "COMMUNITY",
          preferences: {},
        },
      ],
      { session },
    );
    return doc;
  }

  async findByUserId(userId: string) {
    return Profile.findOne({ userId }).lean();
  }

  async updateByUserId(userId: string, patch: Record<string, unknown>) {
    return Profile.findOneAndUpdate(
      { userId },
      { $set: patch },
      { new: true },
    ).lean();
  }

  async deleteByUserId(userId: string) {
    return Profile.findOneAndDelete({ userId }).lean();
  }

  async countAll() {
    return Profile.countDocuments({});
  }
}
