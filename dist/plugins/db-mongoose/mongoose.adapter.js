"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongooseAdapter = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
class MongooseAdapter {
    async connect() {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is not defined");
        }
        await mongoose_1.default.connect(process.env.MONGO_URI);
    }
    async disconnect() {
        await mongoose_1.default.disconnect();
    }
    getClient() {
        return mongoose_1.default;
    }
}
exports.MongooseAdapter = MongooseAdapter;
