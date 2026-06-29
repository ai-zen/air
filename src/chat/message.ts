import { Message } from "@ai-zen/agents-core";
import type { ChatCtx } from "./shared.js";
import { SYSTEM_PROMPT } from "./shared.js";
import { sendAndPrint } from "./print.js";
import { saveMessages, saveSnapshot } from "../config.js";
import { buildAgent } from "../agent-factory.js";
import { contextSize, shouldMigrate, generateMigrationDoc, MAX_CONTEXT_CHARS } from "../migration.js";

export async function handleMessage(ctx: ChatCtx, text: string): Promise<void> {
  try {
    await sendAndPrint(ctx.agent, text);
    saveMessages(ctx.agent.messages);

    if (shouldMigrate(ctx.agent.messages)) {
      console.log(`🔄 上下文 ${contextSize(ctx.agent.messages)}/${MAX_CONTEXT_CHARS}，准备迁移...`);
      try {
        const snap = saveSnapshot(ctx.agent.messages);
        console.log(`  💾 快照: ${snap}`);
        const summary = await generateMigrationDoc(ctx.agent.messages);
        const msgs = [Message.System(SYSTEM_PROMPT), Message.User(summary)];
        saveMessages(msgs);
        console.log("✅ 迁移完成\n");
        ctx.agent = await buildAgent(msgs);
      } catch (err: any) { console.error(`❌ 迁移失败: ${err.message}\n`); }
    }
  } catch (err: any) { console.error(`\n❌ ${err.message}`); }
}
