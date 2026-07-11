"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BCRYPT_ROUNDS = exports.LOCKOUT_DURATION_MS = exports.MAX_FAILED_LOGIN_ATTEMPTS = void 0;
/** Failed login attempts before lockout */
exports.MAX_FAILED_LOGIN_ATTEMPTS = 5;
/** Lock duration after max failed attempts */
exports.LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
/** bcrypt cost factor */
exports.BCRYPT_ROUNDS = 10;
