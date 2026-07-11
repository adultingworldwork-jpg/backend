"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lettersModule = lettersModule;
const letters_routes_1 = require("./letters.routes");
async function lettersModule(app) {
    await app.register(letters_routes_1.lettersRoutes);
}
