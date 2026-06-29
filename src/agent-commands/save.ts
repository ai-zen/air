import type { ChatCtx } from "../agent-types.js";
import { saveSnapshot } from "../config.js";

export async function cmdSave(ctx: ChatCtx) {
  console.log(`\n✅ 快照: ${saveSnapshot(ctx.agent.messages)}\n`);
}
