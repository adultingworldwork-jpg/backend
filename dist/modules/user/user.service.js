"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const user_repository_1 = require("./user.repository");
class UserService {
    constructor() {
        this.repo = new user_repository_1.UserRepository();
    }
    async getAllUsers() {
        return this.repo.findAll();
    }
}
exports.UserService = UserService;
