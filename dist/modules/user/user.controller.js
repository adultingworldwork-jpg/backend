"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_service_1 = require("./user.service");
class UserController {
    async getUsers(request, reply) {
        const service = new user_service_1.UserService();
        const users = await service.getAllUsers();
        return reply.send({
            success: true,
            data: users,
        });
    }
}
exports.UserController = UserController;
