import "dotenv/config";
import mongoose from "mongoose";
import { Permission, Role } from "../src/models/rbac.model";

/**
 * Idempotent RBAC seed for Adulting101.
 * Creates permissions + admin/user roles if missing.
 */
async function main() {
  await mongoose.connect(process.env.MONGO_URI!);

  // Drop legacy email-based unique indexes from pre–Phase-1 schema
  try {
    const col = mongoose.connection.collection("users");
    for (const name of ["email_1"]) {
      try {
        await col.dropIndex(name);
        console.log(`Dropped legacy index: ${name}`);
      } catch {
        /* index may not exist */
      }
    }
  } catch {
    /* collection may not exist yet */
  }

  const permissionNames = [
    "user.read",
    "user.create",
    "user.update",
    "user.delete",
    "admin.access",
  ];

  const permissionIds = [];
  for (const name of permissionNames) {
    const doc = await Permission.findOneAndUpdate(
      { name },
      { name },
      { upsert: true, new: true },
    );
    permissionIds.push(doc._id);
  }

  await Role.findOneAndUpdate(
    { name: "admin" },
    { name: "admin", permissions: permissionIds },
    { upsert: true, new: true },
  );

  await Role.findOneAndUpdate(
    { name: "user" },
    { name: "user", permissions: [] },
    { upsert: true, new: true },
  );

  console.log("✅ Seeded roles: admin, user");
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
