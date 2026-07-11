"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateRoutes = templateRoutes;
const template_controller_1 = require("./template.controller");
async function templateRoutes(app) {
    const controller = new template_controller_1.TemplateController();
    app.post('/', controller.create.bind(controller));
    app.get('/', controller.findAll.bind(controller));
}
