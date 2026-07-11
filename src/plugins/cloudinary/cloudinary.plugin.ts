import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { config } from "@/config";
import { StorageService } from "@/core/interfaces/storage";
import { CloudinaryStorageService } from "./cloudinary.service";

declare module "fastify" {
  interface FastifyInstance {
    /** Framework storage abstraction (Cloudinary-backed). Do not use Cloudinary SDK in modules. */
    storage?: StorageService;
  }
}

async function cloudinaryPlugin(app: FastifyInstance) {
  const storage = new CloudinaryStorageService(config.cloudinary);

  if (!storage.configured) {
    app.log.warn(
      "Cloudinary plugin enabled but CLOUDINARY_* env vars are incomplete. Uploads will fail until configured.",
    );
  } else {
    app.log.info("Cloudinary storage configured");
  }

  app.decorate("storage", storage);
}

export default fp(cloudinaryPlugin, {
  name: "cloudinary",
});
