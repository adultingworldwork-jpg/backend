"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blogModule = blogModule;
const blog_routes_1 = require("./blog.routes");
async function blogModule(app) {
    await app.register(blog_routes_1.blogRoutes);
}
