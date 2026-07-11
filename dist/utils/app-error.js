"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
const error_registry_1 = require("@/core/error-registry");
class AppError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.type = code;
    }
    /** Build from registry defaults (optional message override). */
    static fromCode(code, message) {
        const def = (0, error_registry_1.getErrorDefinition)(code);
        return new AppError(message ?? def.message, def.statusCode, def.code);
    }
    static unauthorized(message) {
        return AppError.fromCode(error_registry_1.ErrorRegistry.UNAUTHORIZED.code, message);
    }
    static invalidCredentials() {
        return AppError.fromCode(error_registry_1.ErrorRegistry.INVALID_CREDENTIALS.code);
    }
    static accountLocked(message) {
        return AppError.fromCode(error_registry_1.ErrorRegistry.ACCOUNT_LOCKED.code, message);
    }
}
exports.AppError = AppError;
