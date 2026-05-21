import "dotenv/config";
import { syncRolesAndPermissions } from "@/lib/services/role.service";
import { SYSTEM_ROLE_DEFINITIONS } from "@/lib/roles/systemRoles";

function parseArgs(argv: string[]) {
  const rolesOnly = argv.includes("--roles-only");
  const usersOnly = argv.includes("--users-only");
  const dryRun = argv.includes("--dry-run");

  return {
    syncRoles: usersOnly ? false : true,
    syncUsers: rolesOnly ? false : true,
    dryRun,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log("Glowish — sync roles & permissions");
  console.log("Source: lib/permissions.ts → Role collection + User.permissions\n");

  for (const def of SYSTEM_ROLE_DEFINITIONS) {
    console.log(`  ${def.name}: ${def.permissions.length} permission(s)`);
  }
  console.log("");

  if (args.dryRun) {
    console.log("Dry run — no database changes.");
    console.log(`Would upsert roles: ${args.syncRoles}`);
    console.log(`Would update user permissions: ${args.syncUsers}`);
    return;
  }

  const result = await syncRolesAndPermissions({
    syncRoles: args.syncRoles,
    syncUsers: args.syncUsers,
  });

  console.log(`Roles upserted: ${result.rolesUpserted}`);
  console.log(`Users updated: ${result.usersUpdated}`);
  console.log("Done.");
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
