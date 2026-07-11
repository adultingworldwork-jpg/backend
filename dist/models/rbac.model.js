"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.Role = exports.Permission = exports.USER_STATUSES = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const permissionSchema = new mongoose_1.default.Schema({
    name: { type: String, unique: true, required: true },
});
const roleSchema = new mongoose_1.default.Schema({
    name: { type: String, unique: true, required: true },
    permissions: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "Permission" }],
});
/** Admin-managed account status (separate from temporary lockUntil lockout). */
exports.USER_STATUSES = ["ACTIVE", "SUSPENDED", "LOCKED"];
/**
 * Anonymous-first User model (docs/AUTH_IDENTITY_MODEL.md).
 * No email / phone fields.
 */
const userSchema = new mongoose_1.default.Schema({
    /** Display username (preferred casing preserved) */
    username: { type: String, required: true },
    /** Case-insensitive unique key */
    usernameNormalized: { type: String, required: true, unique: true, index: true },
    /** URL-safe slug derived from username */
    usernameSlug: { type: String, required: true, index: true },
    passwordHash: { type: String, required: true },
    recoveryPassphraseHash: { type: String, required: true },
    role: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Role" },
    acceptedTermsAt: { type: Date },
    /**
     * Admin-managed status.
     * ACTIVE — normal
     * SUSPENDED — admin suspended (cannot login)
     * LOCKED — admin locked (cannot login)
     */
    status: {
        type: String,
        enum: exports.USER_STATUSES,
        default: "ACTIVE",
        index: true,
    },
    /** Account lockout */
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    /**
     * Refresh token rotation:
     * - currentRefreshTokenHash: SHA-256 of active refresh token
     * - previousRefreshTokenHash: prior token (reuse detection)
     */
    currentRefreshTokenHash: { type: String, default: null },
    previousRefreshTokenHash: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, {
    timestamps: false,
});
userSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
});
exports.Permission = mongoose_1.default.model("Permission", permissionSchema);
exports.Role = mongoose_1.default.model("Role", roleSchema);
exports.User = mongoose_1.default.model("User", userSchema);
