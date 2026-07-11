"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupPlugins = setupPlugins;
const plugins_1 = require("../plugins");
async function setupPlugins(app) {
    await (0, plugins_1.registerPlugins)(app);
}
