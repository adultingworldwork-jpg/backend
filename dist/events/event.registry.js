"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEventListeners = registerEventListeners;
const send_welcome_email_listener_1 = require("./listeners/user/send-welcome-email.listener");
function registerEventListeners(eventService) {
    eventService.register(send_welcome_email_listener_1.sendWelcomeEmailListener);
}
