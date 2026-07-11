"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatModule = chatModule;
const chat_routes_1 = require("./chat.routes");
const chat_socket_1 = require("./chat.socket");
async function chatModule(app) {
    await app.register(chat_routes_1.chatRoutes);
    // Register Socket.IO handlers on the existing realtime plugin (no second server)
    if (app.realtime) {
        (0, chat_socket_1.registerChatSocketHandlers)(app);
    }
    else {
        app.log.warn("Chat HTTP routes loaded but realtime plugin is not available for sockets");
    }
}
