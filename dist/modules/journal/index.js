"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.journalModule = journalModule;
const journal_routes_1 = require("./journal.routes");
async function journalModule(app) {
    await app.register(journal_routes_1.journalRoutes);
}
