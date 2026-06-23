import chalk from "chalk";
import { createInterface } from "node:readline";
import { Agent, Message } from "@ai-zen/agents-core";
import { DeltaRenderer } from "./delta-renderer.js";
import type { AgentNS } from "@ai-zen/agents-core";
import inquirer from "inquirer";
import { readConfig, readMessages, saveMessages, clearMessages, saveSnapshot, listSnapshots, loadSnapshot } from "./config.js";
import { buildAgent } from "./agent-factory.js";
import { contextSize, shouldMigrate, generateMigrationDoc, MAX_CONTEXT_CHARS } from "./migration.js";

const SYSTEM_PROMPT = [
  "你是一个AI助手，专门帮助用户回答问题和执行任务。请用中文回复。",
  "",
  "## 行为准则",
  "1. 做任何改动之前，必须先跟用户商量，获得明确指示之后再行动。",
  "2. 用户没有明确要求产出文件时，不得自行创建任何文件到项目中。讨论就停留在讨论层面。",
  "3. 区分危险操作：删除文件、覆盖文件、安装卸载软件、修改系统配置、执行耗时任务等属于危险操作。执行前必须评估影响范围，并向用户说明风险，获得用户明确的书面的确认之后再执行。",
  "4. 追责原则：你的每一步操作都应当基于用户的明确指令。如果出了问题，可以从用户说过的话追溯责任——是用户让你做的，用户承担责任。所以你不需要畏手畏脚，只要用户明确说了\u201c做\u201d，你就放心去做。",
  "",
  "## 记忆",
  "你可以使用 shell 工具执行任何命令。如果你有需要长期记住的信息（用户偏好、项目约定、任务进度等），请写入以下位置：",
  "- 全局记忆: ~/.ai-zen/air/temp/*.md",
  "- 项目记忆: $(cwd)/.ai-zen/air/temp/*.md",
  "下次启动时用 shell 读取即可。这是你唯一的记忆方式。",
].join("\n");

// 流式发送

async function sendAndPrint(agent: Agent, text: string): Promise<void> {
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

async function sendAndSave(agent: Agent, text: string): Promise<void> {
  console.log(chalk.green.bold("\n🤖 AI:"));
  await sendAndPrint(agent, text);
}

// 对话循环

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
  let agent = await buildAgent(msgs);

  if (initialMessage) {
    console.log(`\n💬 你: ${initialMessage}`);
    try {
      await sendAndSave(agent, initialMessage);
      saveMessages(agent.messages);
      console.log("💾 已保存\n");
    } catch (err: any) { console.error(`\n❌ ${err.message}`); }
    return;
  }

  const msgCount = agent.messages.filter((m) => m.role !== "system").length;
  console.log(msgCount > 0
    ? `\n💬 继续上次对话 (${msgCount} 条，/${contextSize(agent.messages)} 字符，输入 /new 重新开始)\n`
    : "\n💬 air — 极简 AI 助手 (输入 /help 查看命令)\n");

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  function ask() {
    rl.question("💬 你: ", async (input) => {
      const t = input.trim();
      if (!t) { ask(); return; }

      if (t.startsWith("/")) {
        const c = t.toLowerCase();
        if (c === "/exit" || c === "/quit") { console.log("\n👋 再见！"); process.exit(0); }
        if (c === "/save") { console.log(`\n✅ 快照: ${saveSnapshot(agent.messages)}\n`); ask(); return; }
        if (c === "/new") { clearMessages(); const msgs = [Message.System(SYSTEM_PROMPT)]; saveMessages(msgs); agent = await buildAgent(msgs); console.log("\n🆕 重新开始\n"); ask(); return; }
        if (c === "/load") {
          const snapshots = listSnapshots();
          if (snapshots.length === 0) {
            console.log("\n📭 没有可用的快照\n");
            ask(); return;
          }
          const { selectedName } = await inquirer.prompt([
            {
              type: "list",
              name: "selectedName",
              message: "选择要加载的快照:",
              pageSize: 15,
              choices: [
                { name: "↩️  取消操作", value: "" },
                ...snapshots.map((s) => ({ name: s.date, value: s.name })),
              ],
            },
          ]);
          if (!selectedName) {
            console.log("\n已取消\n");
            ask(); return;
          }
          let msgs = loadSnapshot(selectedName);
          if (msgs.length === 0) {
            msgs = [Message.System(SYSTEM_PROMPT)];
          }
          saveMessages(msgs);
          agent = await buildAgent(msgs);
          const snap = snapshots.find((s) => s.name === selectedName);
          console.log("\n✅ 已加载快照: " + (snap ? snap.date : selectedName) + "\n");
          ask(); return;
        }
        if (c === "/back") {
          await handleBack();
          ask(); return;
        }
        if (c === "/help") { console.log("\n/exit /quit  退出\n/save        保存快照\n/load        加载快照\n/new         重新开始\n/back        撤回消息\n/help        帮助\n"); ask(); return; }
        console.log(`\n❌ 未知命令: ${t}\n`); ask(); return; }

      try {
        await sendAndSave(agent, t);
        saveMessages(agent.messages);

        if (shouldMigrate(agent.messages)) {
          console.log(`🔄 上下文 ${contextSize(agent.messages)}/${MAX_CONTEXT_CHARS}，准备迁移...`);
          try {
            const snap = saveSnapshot(agent.messages);
            console.log(`  💾 快照: ${snap}`);
            const summary = await generateMigrationDoc(agent.messages);
            const msgs = [Message.System(SYSTEM_PROMPT), Message.User(summary)];
            saveMessages(msgs);
            agent = await buildAgent(msgs);
            console.log("✅ 迁移完成\n");
          } catch (err: any) { console.error(`❌ 迁移失败: ${err.message}\n`); }
        }
      } catch (err: any) { console.error(`\n❌ ${err.message}`); }
      ask();
    });
  }

  async function handleBack(): Promise<void> {
    const targets: { index: number; role: string; label: string; preview: string }[] = [];
    for (let i = 0; i < agent.messages.length; i++) {
      const msg = agent.messages[i];
      if (msg.role === "user") {
        const text = typeof msg.content === "string" ? msg.content : "";
        if (text) {
          targets.push({ index: i, role: "user", label: "👤 用户", preview: text.substring(0, 60) + (text.length > 60 ? "..." : "") });
        }
      } else if (msg.role === "tool" || msg.role === "function") {
        const text = typeof msg.content === "string" ? msg.content : "";
        if (text) {
          targets.push({ index: i, role: msg.role, label: "🔧 工具", preview: text.substring(0, 60) + (text.length > 60 ? "..." : "") });
        }
      }
    }

    if (targets.length === 0) {
      console.log("\n❌ 还没有消息可以撤回\n");
      return;
    }

    console.log("\n📋 选择要撤回到哪条消息（将删除所选及其之后的所有内容）：\n");

    const { selectedIndex } = await inquirer.prompt([
      {
        type: "list",
        name: "selectedIndex",
        message: "撤回到:",
        pageSize: 15,
        choices: [
          { name: "↩️  取消操作", value: -1 },
          ...targets.map((t) => ({ name: t.label + " " + t.preview, value: t.index })),
        ],
      },
    ]);

    if (selectedIndex === -1) { console.log("\n已取消\n"); return; }

    const selectedMsg = agent.messages[selectedIndex];
    const isUserMsg = selectedMsg.role === "user";
    const originalText = typeof selectedMsg.content === "string" ? selectedMsg.content : "";
    const sliceEnd = isUserMsg ? selectedIndex : selectedIndex + 1;
    agent.messages = agent.messages.slice(0, sliceEnd);

    if (isUserMsg) {
      console.log("\n原内容: " + originalText.substring(0, 200) + (originalText.length > 200 ? "..." : "") + "\n");
      const { editChoice } = await inquirer.prompt([
        {
          type: "list",
          name: "editChoice",
          message: "请选择:",
          choices: [
            { name: "✏️  修改后重新发送", value: "edit" },
            { name: "🔄 直接重新发送", value: "resend" },
            { name: "↩️  取消操作", value: "cancel" },
          ],
        },
      ]);
      if (editChoice === "cancel") { console.log("\n已取消\n"); return; }

      let textToSend = originalText;
      if (editChoice === "edit") {
        const { editedContent } = await inquirer.prompt([
          { type: "input", name: "editedContent", message: "修改消息:", default: originalText },
        ]);
        if (!editedContent.trim()) { console.log("\n❌ 消息不能为空\n"); return; }
        textToSend = editedContent.trim();
      }

      agent = await buildAgent(agent.messages);
      await sendAndSave(agent, textToSend);
      saveMessages(agent.messages);
    } else {
      console.log("\n💡 请输入一条新消息继续对话\n");
      const { newMessage } = await inquirer.prompt([
        { type: "input", name: "newMessage", message: "新消息:" },
      ]);
      if (!newMessage.trim()) { console.log("\n已取消\n"); return; }
      agent = await buildAgent(agent.messages);
      await sendAndSave(agent, newMessage.trim());
      saveMessages(agent.messages);
    }
  }

  ask();
  process.on("SIGINT", () => { console.log("\n\n👋 再见！"); process.exit(0); });
}
