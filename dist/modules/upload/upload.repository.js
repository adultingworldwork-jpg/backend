"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadRepository = void 0;
const upload_model_1 = require("./upload.model");
class UploadRepository {
    async create(data) {
        return upload_model_1.Upload.create(data);
    }
    async findById(id) {
        return upload_model_1.Upload.findById(id).lean();
    }
    async deleteById(id) {
        return upload_model_1.Upload.findByIdAndDelete(id).lean();
    }
}
exports.UploadRepository = UploadRepository;
