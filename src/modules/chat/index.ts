import { FastifyInstance } from "fastify";
import { chatRoutes } from "./chat.routes";
import { registerChatSocketHandlers } from "./chat.socket";

export async function chatModule(app: FastifyInstance) {
  await app.register(chatRoutes);

  // Register Socket.IO handlers on the existing realtime plugin (no second server)
  if (app.realtime) {
    registerChatSocketHandlers(app);
  } else {
    app.log.warn(
      "Chat HTTP routes loaded but realtime plugin is not available for sockets",
    );
  }
}
