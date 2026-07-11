import { FastifyInstance } from "fastify";
import { UploadController } from "./upload.controller";
import { authGuard } from "@/core/auth.guard";

export async function uploadRoutes(app: FastifyInstance) {
  const controller = new UploadController();

  // Auth required for uploads; anonymous product users will use JWT after Phase 1.
  app.post(
    "/",
    { preHandler: [authGuard] },
    controller.upload.bind(controller),
  );

  app.delete(
    "/:id",
    { preHandler: [authGuard] },
    controller.remove.bind(controller),
  );
}
