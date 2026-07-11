"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTemplateSchema = void 0;
const zod_1 = require("zod");
exports.createTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
});
