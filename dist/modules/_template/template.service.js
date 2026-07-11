"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateService = void 0;
const app_error_1 = require("../../utils/app-error");
class TemplateService {
    constructor(ctx) {
        this.ctx = ctx;
        void this.ctx;
    }
    async create(data) {
        void data;
        throw new Error("Not implemented: connect DB layer");
    }
    async findAll() {
        throw new app_error_1.AppError("Not implemented", 501, "NOT_IMPLEMENTED");
    }
}
exports.TemplateService = TemplateService;
