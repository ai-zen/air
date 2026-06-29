import type { SessionCtx } from "../shared.js";
import { saveAndNew } from "../shared.js";

export async function cmdNew(ctx: SessionCtx): Promise<void> {
  await saveAndNew(ctx);
  console.log("\n🆕 重新开始\n");
}
