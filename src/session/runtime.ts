import { Agent, Message } from "@ai-zen/agents-core";
import { readConfig, readMessages, saveMessages, saveSnapshot } from "../config.js";
import { buildAgent } from "../agent-factory.js";
import { contextSize } from "../migration.js";
import { SessionCtx, SYSTEM_PROMPT, saveAndNew, ask } from "./shared.js";
import { sendAndPrint } from "./print.js";

export async function runConversation(initialMessage?: string): Promise<void> {
  const config = readConfig();
  if (!config.apiKey) {
    console.error("❌ 请先设置 API Key: air key <your-key>");
    console.error("   获取 Key: https://platform.deepseek.com/api_keys");
    process.exit(1);
  }

  let msgs = readMessages();
  if (msgs.length === 0) {
    msgs = [Message.System(SYSTEM_PROMPT)];
    saveMessages(msgs);
  }
  const agent: Agent = await buildAgent(msgs);
  const ctx: SessionCtx = { agent };

  if (initialMessage) {
    const hasHistory = ctx.agent.messages.some(m => m.role === "user" || m.role === "assistant");
    if (hasHistory) {
      const snap = saveSnapshot(ctx.agent.messages);
      console.log(`💾 已存档旧对话: ${snap}\n`);
    }
    await saveAndNew(ctx);
    console.log(`💬 你: ${initialMessage}`);
    try {
      await sendAndPrint(ctx.agent, initialMessage);
      saveMessages(ctx.agent.messages);
    } catch (err: any) { console.error(`\n❌ ${err.message}`); }
    console.log("\n💬 继续对话 (输入 /exit 退出)\n");
    await ask(ctx);
    return;
  }

  const msgCount = ctx.agent.messages.filter((m) => m.role !== "system").length;
  console.log(msgCount > 0
    ? `\n💬 继续上次对话 (${msgCount} 条，/${contextSize(ctx.agent.messages)} 字符，输入 /new 重新开始)\n`
    : "\n💬 air — 极简 AI 助手 (输入 /help 查看命令)\n");

  await ask(ctx);
}
