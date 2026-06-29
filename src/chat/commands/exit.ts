import type { ChatCtx } from "../shared.js";

export async function cmdExit(ctx: ChatCtx): Promise<void> {
  console.log("\n👋 再见！");
  process.exit(0);
}
