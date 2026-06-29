import type { ChatCtx } from "../shared.js";
import { Message } from "@ai-zen/agents-core";
import { saveMessages } from "../../config.js";
import { buildAgent } from "../../agent-factory.js";
import { SYSTEM_PROMPT } from "../shared.js";

export async function cmdNew(ctx: ChatCtx): Promise<void> {
  const msgs = [Message.System(SYSTEM_PROMPT)];
  saveMessages(msgs);
  ctx.agent = await buildAgent(msgs);
  console.log("\n🆕 新会话\n");
}
