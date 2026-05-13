import "dotenv/config";
import { runReset } from "./reset";
import { runSeed } from "./seed";

async function main() {
  console.log("=== Reset database ===\n");
  await runReset();
  console.log("\n=== Seed database ===\n");
  await runSeed();
  console.log("\n=== Reset + seed finished ===\n");
}

main().catch((err) => {
  console.error("Reset and seed failed:", err);
  process.exit(1);
});
