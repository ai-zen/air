import type { ChatCtx } from "../agent-types.js";
import { Message } from "@ai-zen/agents-core";
import { saveMessages } from "../config.js";
import { buildAgent } from "../agent-factory.js";
import { SYSTEM_PROMPT } from "../agent-constants.js";

export async function cmdNew(ctx: ChatCtx): Promise<void> {
  const msgs = [Message.System(SYSTEM_PROMPT)];
  saveMessages(msgs);
  ctx.agent = await buildAgent(msgs);
  console.log("\n🆕 新会话\n");
}
