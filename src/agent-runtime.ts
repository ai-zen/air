import { Agent, Message } from "@ai-zen/agents-core";
import type { AgentNS } from "@ai-zen/agents-core";
import chalk from "chalk";
import inquirer from "inquirer";
import { DeltaRenderer } from "./delta-renderer.js";
import { readConfig, readMessages, saveMessages, saveSnapshot } from "./config.js";
import { buildAgent } from "./agent-factory.js";
import { contextSize, shouldMigrate, generateMigrationDoc, MAX_CONTEXT_CHARS } from "./migration.js";
import { dispatchCommand } from "./agent-commands/index.js";
import type { ChatCtx } from "./agent-types.js";
import { SYSTEM_PROMPT } from "./agent-constants.js";

// ==================== print (内部使用) ====================

async function send(agent: Agent, text: string): Promise<void> {
  console.log(chalk.green.bold("\n🤖 AI:"));
  const renderer = new DeltaRenderer({
    reasoningHeader: "\n\n💭 思考中...\n",
    contentHeader: "\n\n💭 回答中...\n",
  });

  function onChunk(chunk: AgentNS.StreamResponseData) {
    const delta = chunk?.choices?.[0]?.delta;
    const fr = chunk?.choices?.[0]?.finish_reason ?? null;
    if (delta) renderer.render(delta, fr);
  }

  function onRun() { renderer.reset(); }
  agent.events.on("run", onRun);
  agent.events.on("chunk", onChunk);
  await agent.send(text);
  agent.events.off("run", onRun);
  agent.events.off("chunk", onChunk);
  process.stdout.write("\n\n");
  console.log();
}

// ==================== message ====================

async function handleMessage(ctx: ChatCtx, text: string): Promise<void> {
  try {
    await ctx.send(text);
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

// ==================== runtime ====================

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
  const ctx: ChatCtx = {
    agent,
    send(text: string) { return send(this.agent, text); },
  };

  if (initialMessage) {
    const hasHistory = ctx.agent.messages.some(m => m.role === "user" || m.role === "assistant");
    if (hasHistory) {
      const snap = saveSnapshot(ctx.agent.messages);
      console.log(`💾 已存档旧对话: ${snap}\n`);
    }
    await dispatchCommand(ctx, "/new");
    console.log(`💬 你: ${initialMessage}`);
    try {
      await ctx.send(initialMessage);
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
