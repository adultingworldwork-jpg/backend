"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = userRoutes;
const user_controller_1 = require("./user.controller");
async function userRoutes(app) {
    const controller = new user_controller_1.UserController();
    app.get("/", controller.getUsers.bind(controller));
}
