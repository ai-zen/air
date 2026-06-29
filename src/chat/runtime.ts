import { Agent, Message } from "@ai-zen/agents-core";
import inquirer from "inquirer";
import { readConfig, readMessages, saveMessages, saveSnapshot } from "../config.js";
import { buildAgent } from "../agent-factory.js";
import { contextSize } from "../migration.js";
import { ChatCtx, SYSTEM_PROMPT } from "./shared.js";
import { dispatchCommand } from "./commands/index.js";
import { handleMessage } from "./message.js";
import { sendAndPrint } from "./print.js";

async function chatLoop(ctx: ChatCtx) {
  while (true) {
    const { input } = await inquirer.prompt([
      { type: "input", name: "input", message: "你:" },
    ]);
    const t = input.trim();
    if (!t) continue;
    if (t.startsWith("/")) {
      await dispatchCommand(ctx, t.toLowerCase());
      continue;
    }
    await handleMessage(ctx, t);
  }
}

export async function runChat(initialMessage?: string): Promise<void> {
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
  const ctx: ChatCtx = { agent };

  if (initialMessage) {
    const hasHistory = ctx.agent.messages.some(m => m.role === "user" || m.role === "assistant");
    if (hasHistory) {
      const snap = saveSnapshot(ctx.agent.messages);
      console.log(`💾 已存档旧对话: ${snap}\n`);
    }
    await dispatchCommand(ctx, "/new");
    console.log(`💬 你: ${initialMessage}`);
    try {
      await sendAndPrint(ctx.agent, initialMessage);
      saveMessages(ctx.agent.messages);
    } catch (err: any) { console.error(`\n❌ ${err.message}`); }
    console.log("\n💬 继续对话 (输入 /exit 退出)\n");
    await chatLoop(ctx);
    return;
  }

  const msgCount = ctx.agent.messages.filter((m) => m.role !== "system").length;
  console.log(msgCount > 0
    ? `\n💬 继续上次对话 (${msgCount} 条，/${contextSize(ctx.agent.messages)} 字符，输入 /new 重新开始)\n`
    : "\n💬 air — 极简 AI 助手 (输入 /help 查看命令)\n");

  await chatLoop(ctx);
}
