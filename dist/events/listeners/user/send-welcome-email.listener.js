"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcomeEmailListener = void 0;
exports.sendWelcomeEmailListener = {
    event: 'user.created',
    async: true,
    handler: async (payload) => {
        console.log('Send welcome email to:', payload.email);
    },
};
