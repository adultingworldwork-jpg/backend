import fp from "fastify-plugin";
import multipart from "@fastify/multipart";
import { FastifyInstance } from "fastify";

/** Multipart form parsing for upload endpoints. */
async function multipartPlugin(app: FastifyInstance) {
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB (books PDF max)
      files: 1,
    },
  });
}

export default fp(multipartPlugin, {
  name: "multipart",
});
