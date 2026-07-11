import fp from "fastify-plugin";
import { AuthService } from "@/modules/auth/auth.service";
import { ProfileService } from "@/modules/profile/profile.service";
import { BlogService } from "@/modules/blog/blog.service";
import { CommunityService } from "@/modules/community/community.service";
import { JournalService } from "@/modules/journal/journal.service";
import { LettersService } from "@/modules/letters/letters.service";
import { ResourcesService } from "@/modules/resources/resources.service";
import { ChatService } from "@/modules/chat/chat.service";
import { AdminService } from "@/modules/admin/admin.service";

export default fp(async (app) => {
  app.decorateRequest("services", null as never);

  app.addHook("onRequest", async (request) => {
    const profile = new ProfileService({
      ctx: request.ctx,
      audit: request.server.audit,
      app: request.server,
    });

    const blog = new BlogService({
      ctx: request.ctx,
      audit: request.server.audit,
    });

    const community = new CommunityService({
      ctx: request.ctx,
      audit: request.server.audit,
    });

    const journal = new JournalService({
      ctx: request.ctx,
      audit: request.server.audit,
    });

    const letters = new LettersService({
      ctx: request.ctx,
      audit: request.server.audit,
    });

    const resources = new ResourcesService({
      ctx: request.ctx,
      audit: request.server.audit,
    });

    const chat = new ChatService({
      ctx: request.ctx,
      audit: request.server.audit,
    });

    const admin = new AdminService({
      ctx: request.ctx,
      audit: request.server.audit,
    });

    request.services = {
      auth: new AuthService({
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
