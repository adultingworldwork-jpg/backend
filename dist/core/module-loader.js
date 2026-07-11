"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerModules = registerModules;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const case_1 = require("../utils/string/case");
const config_1 = require("../config");
const error_handler_1 = require("../core/error-handler");
async function registerModules(app) {
    const modulesPath = path.resolve(__dirname, "..", "modules");
    const moduleDirs = fs
        .readdirSync(modulesPath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
        .map((entry) => entry.name);
    const basePrefix = `${config_1.config.app.api.prefix}/${config_1.config.app.api.version}`;
    const moduleFileName = path.extname(__filename) === ".js" ? "index.js" : "index.ts";
    for (const dir of moduleDirs) {
        const modulePath = path.join(modulesPath, dir, moduleFileName);
        if (!fs.existsSync(modulePath))
            continue;
        const moduleImport = require(modulePath);
        const moduleFunction = moduleImport[`${dir}Module`];
        if (typeof moduleFunction === "function") {
            const systemModules = ["health", "metrics"];
            const isSystemModule = systemModules.includes(dir);
            const prefix = isSystemModule
                ? ""
                : `${basePrefix}/${(0, case_1.toKebabCase)(dir)}`;
            // Register inside a child context that shares the standard error envelope.
            // Fastify error handlers are encapsulated — root setErrorHandler alone
            // does not apply to routes registered via app.register without this.
            await app.register(async (instance) => {
                (0, error_handler_1.setupErrorHandler)(instance);
                await moduleFunction(instance);
            }, { prefix });
            app.log.info(`✅ Module loaded: ${dir}`);
        }
    }
}
