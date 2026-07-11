"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Profile = exports.PROFILE_VISIBILITY = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
exports.PROFILE_VISIBILITY = ["PUBLIC", "COMMUNITY", "PRIVATE"];
/**
 * Profile entity — user-facing presentation only.
 * Identity/auth fields live on User (Auth module).
 */
const profileSchema = new mongoose_1.default.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    displayName: { type: String, required: true, trim: true },
    bio: { type: String, default: "", maxlength: 1000 },
    avatar: { type: String, default: null },
    coverImage: { type: String, default: null },
    pronouns: { type: String, default: "", maxlength: 40 },
    location: { type: String, default: "", maxlength: 80 },
    website: { type: String, default: "", maxlength: 200 },
    dateOfBirth: { type: Date, default: null },
    visibility: {
        type: String,
        enum: exports.PROFILE_VISIBILITY,
        default: "COMMUNITY",
    },
    preferences: {
        type: mongoose_1.default.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
});
exports.Profile = mongoose_1.default.model("Profile", profileSchema);
