import {
  ErrorCode,
  ErrorRegistry,
  getErrorDefinition,
} from "@/core/error-registry";

export class AppError extends Error {
  statusCode: number;
  code: ErrorCode;
  type: ErrorCode;

  constructor(message: string, statusCode: number, code: ErrorCode) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.type = code;
  }

  /** Build from registry defaults (optional message override). */
  static fromCode(code: ErrorCode, message?: string): AppError {
    const def = getErrorDefinition(code);
    return new AppError(message ?? def.message, def.statusCode, def.code);
  }

  static unauthorized(message?: string) {
    return AppError.fromCode(ErrorRegistry.UNAUTHORIZED.code, message);
  }

  static invalidCredentials() {
    return AppError.fromCode(ErrorRegistry.INVALID_CREDENTIALS.code);
  }

  static accountLocked(message?: string) {
    return AppError.fromCode(ErrorRegistry.ACCOUNT_LOCKED.code, message);
  }
}
