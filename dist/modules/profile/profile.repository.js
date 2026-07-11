"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileRepository = void 0;
const profile_model_1 = require("./profile.model");
class ProfileRepository {
    async create(data) {
        return profile_model_1.Profile.create({
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
    async createWithSession(data, session) {
        const [doc] = await profile_model_1.Profile.create([
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
        ], { session });
        return doc;
    }
    async findByUserId(userId) {
        return profile_model_1.Profile.findOne({ userId }).lean();
    }
    async updateByUserId(userId, patch) {
        return profile_model_1.Profile.findOneAndUpdate({ userId }, { $set: patch }, { new: true }).lean();
    }
    async deleteByUserId(userId) {
        return profile_model_1.Profile.findOneAndDelete({ userId }).lean();
    }
    async countAll() {
        return profile_model_1.Profile.countDocuments({});
    }
}
exports.ProfileRepository = ProfileRepository;
