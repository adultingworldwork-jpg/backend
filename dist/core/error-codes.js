"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorDefinition = exports.ErrorRegistry = exports.ErrorCodes = void 0;
/**
 * Re-export from the standard Error Code Registry.
 * Prefer importing from `@/core/error-registry` for full metadata.
 */
var error_registry_1 = require("./error-registry");
Object.defineProperty(exports, "ErrorCodes", { enumerable: true, get: function () { return error_registry_1.ErrorCodes; } });
Object.defineProperty(exports, "ErrorRegistry", { enumerable: true, get: function () { return error_registry_1.ErrorRegistry; } });
Object.defineProperty(exports, "getErrorDefinition", { enumerable: true, get: function () { return error_registry_1.getErrorDefinition; } });
