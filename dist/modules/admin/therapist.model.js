"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Therapist = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Admin-managed Safe Space therapist roster.
 * Access codes are 4-digit PIN codes set by admins (shown in Admin UI).
 */
const therapistSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, trim: true },
    nameNormalized: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    specialty: { type: String, default: "", trim: true },
    /** 4-digit access code (product requirement: admin can view/share the PIN) */
    code: { type: String, required: true, match: /^\d{4}$/, index: true },
    repliesCount: { type: Number, default: 0, min: 0 },
    sessionsAttended: { type: Number, default: 0, min: 0 },
    lastLoginAt: { type: Date, default: null },
    createdBy: { type: String, default: null },
}, { timestamps: true });
therapistSchema.index({ code: 1 }, { unique: true });
exports.Therapist = mongoose_1.default.model("Therapist", therapistSchema);
