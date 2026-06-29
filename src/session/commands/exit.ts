import type { SessionCtx } from "../shared.js";

export async function cmdExit(ctx: SessionCtx): Promise<void> {
  console.log("\n👋 再见！");
  process.exit(0);
}
