import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().default(3000),

  DB_PROVIDER: z.literal("mongodb"),
  MONGO_URI: z.string().min(1),

  JWT_SECRET: z.string().min(10),

  LOG_LEVEL: z.enum(["info", "warn", "error", "debug"]).default("info"),
  API_PREFIX: z.string().default("/api"),
  API_VERSION: z.string().default("v1"),
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  PLUGINS: z.string().default(""),

  /** Comma-separated browser origins allowed by CORS (no trailing slash) */
  CORS_ORIGIN: z
    .string()
    .default(
      "http://localhost:3001, http://localhost:3000, https://audulting101.vercel.app",
    ),

  /** Cloudinary (required when PLUGINS includes cloudinary) */
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default("adulting101"),
});

export type EnvConfig = z.infer<typeof envSchema>;
