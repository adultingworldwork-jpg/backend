"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const auth_service_1 = require("@/modules/auth/auth.service");
const profile_service_1 = require("@/modules/profile/profile.service");
const blog_service_1 = require("@/modules/blog/blog.service");
const community_service_1 = require("@/modules/community/community.service");
const journal_service_1 = require("@/modules/journal/journal.service");
const letters_service_1 = require("@/modules/letters/letters.service");
const resources_service_1 = require("@/modules/resources/resources.service");
const chat_service_1 = require("@/modules/chat/chat.service");
const admin_service_1 = require("@/modules/admin/admin.service");
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    app.decorateRequest("services", null);
    app.addHook("onRequest", async (request) => {
        const profile = new profile_service_1.ProfileService({
            ctx: request.ctx,
            audit: request.server.audit,
            app: request.server,
        });
        const blog = new blog_service_1.BlogService({
            ctx: request.ctx,
            audit: request.server.audit,
        });
        const community = new community_service_1.CommunityService({
            ctx: request.ctx,
            audit: request.server.audit,
        });
        const journal = new journal_service_1.JournalService({
            ctx: request.ctx,
            audit: request.server.audit,
        });
        const letters = new letters_service_1.LettersService({
            ctx: request.ctx,
            audit: request.server.audit,
        });
        const resources = new resources_service_1.ResourcesService({
            ctx: request.ctx,
            audit: request.server.audit,
        });
        const chat = new chat_service_1.ChatService({
            ctx: request.ctx,
            audit: request.server.audit,
        });
        const admin = new admin_service_1.AdminService({
            ctx: request.ctx,
            audit: request.server.audit,
        });
        request.services = {
            auth: new auth_service_1.AuthService({
                ctx: request.ctx,
                jwt: request.server.jwt,
                audit: request.server.audit,
                log: request.log,
                profile,
            }),
            profile,
            blog,
            community,
            journal,
            letters,
            resources,
            chat,
            admin,
        };
    });
});
