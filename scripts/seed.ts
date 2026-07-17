import "dotenv/config";
import mongoose from "mongoose";
import { runSeed } from "../src/bootstrap/seed";

/**
 * Idempotent seed for Adulting101.
 * - RBAC permissions + admin/user roles
 * - Default Super Admin (if none exists)
 *
 * Run: npx ts-node -r tsconfig-paths/register scripts/seed.ts
 */
async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  await runSeed();
}

main()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  });
