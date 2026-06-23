import chalk from "chalk";
import { createInterface } from "node:readline";
import { Agent, Message, OpenAI, ChatGPT, CallbackTool } from "@ai-zen/agents-core";
import type { AgentNS } from "@ai-zen/agents-core";
import { readConfig, saveConfig, readMessages, saveMessages, clearMessages, saveSnapshot } from "./config.js";
import { execSync } from "node:child_process";
import { DeltaRenderer } from "./delta-renderer.js";

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

const MAX_CONTEXT_CHARS = 660000;
const MODEL_NAME = "deepseek-v4-flash";
const API_ENDPOINT = "https://api.deepseek.com/v1";

// 上下文计数

export function contextSize(messages: any[]): number {
  return JSON.stringify(messages).length;
}

export function shouldMigrate(messages: any[]): boolean {
  return contextSize(messages) >= MAX_CONTEXT_CHARS;
}

// 唯一的工具：shell

const shellTool = new CallbackTool({
  function: {
    name: "shell",
    description: "执行 shell 命令并返回输出",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "要执行的命令" },
      },
      required: ["command"],
    },
  },
  callback(this, args: { command: string }) {
    try {
      return execSync(args.command, { encoding: "utf-8", timeout: 30000 });
    } catch (e: any) {
      return `错误: ${e.message}`;
    }
  },
});

// 构建模型

async function buildModel(apiKey: string) {
  const endpoint = new OpenAI({ openai_endpoint: API_ENDPOINT, api_key: apiKey });
  return new ChatGPT({
    model_config: {},
    request_config: await endpoint.chatCompletion(MODEL_NAME),
  });
}

// 生成交接文档

export async function generateMigrationDoc(messages: any[]): Promise<string> {
  const config = readConfig();
  const model = await buildModel(config.apiKey);
  const agent = new Agent({
    model,
    messages: [Message.System(`你是一个专业的任务交接分析师。你的任务是阅读一段完整的AI助手与用户的对话历史，筛选出对后续工作有用的关键信息，生成一份结构清晰的交接文档。

这份交接文档将作为新会话的第一条用户消息，让新的AI助手了解任务背景并继续工作。

请按以下模板生成 Markdown 格式的文档：

## ✅ 已完成的任务
列出已经完成的任务及其产出物（文件路径、代码片段位置等）。
如果没有已完成的任务，保留此标题并注明"无"。
注意：只记录任务标题和产出路径，不需要描述完成过程的细节。

## 📋 未完成的任务
列出所有待继续完成的任务，包含：
- 任务描述
- 当前进度
- 下一步需要做什么
- 相关的文件路径
- 优先级（如果对话中提到过）

## 🧠 重要记忆
记录所有对后续工作有影响的信息，包括但不限于：
- 用户的技术偏好和约定
- 踩过的坑和教训
- 项目特定的架构决策
- 任何对后续工作有指导意义的信息

## 📁 文件索引
按用途分类列出对话中涉及的重要文件路径，方便新 Agent 按需阅读。
**请对每个文件注明其用途或作用**，让接手者能快速判断哪些文件需要优先阅读。

## 🔔 接手指令
接手后请按以下步骤操作：
1. **读文件** — 使用 shell 工具（cat、grep、find 等）读取「文件索引」中列出的关键文件，以实际代码为准，不要依赖训练数据或过往经验
2. **对状态** — 确认代码中的关键常量、函数签名、配置等是否与文档描述一致
3. **再行动** — 确认无误后再继续未完成任务，做任何改动前先跟用户商量

---

注意事项：
1. 只包含确定的信息，不要猜测或补充对话中没有的内容
2. 已完成的任务只需列出任务标题和产出路径，不要罗列完成过程的每一步
3. 如果某个部分没有需要记录的内容，标注"无"即可
4. 语言风格与原始对话一致（中文）`)],
    tools: [],
  });
  const result = await agent.send(`请阅读以下对话历史，生成交接文档：\n\n${messages.map((m) => `[${m.role}] ${typeof m.content === "string" ? m.content : ""}`).join("\n\n")}`);
  const last = result.at(-1);
  if (!last || last.status === "error") throw new Error("生成交接文档失败");
  return typeof last.content === "string" ? last.content : "";
}

// 构建 Agent

async function buildAgent(savedMessages: any[]): Promise<Agent> {
  const config = readConfig();
  const model = await buildModel(config.apiKey);
  const messages: AgentNS.Message[] = [];
  for (const m of savedMessages) messages.push(new Message(m));
  return new Agent({ model, messages, tools: [shellTool] });
}

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

// 对话循环

export async function runConversation(initialMessage?: string): Promise<void> {
  const config = readConfig();
  if (!config.apiKey) {
    console.error("❌ 请先设置 API Key: air key <your-key>");
    console.error("   获取 Key: https://platform.deepseek.com/api_keys");
    process.exit(1);
  }

  let savedMessages = readMessages();
  if (savedMessages.length === 0) {
    savedMessages = [Message.System(SYSTEM_PROMPT)];
    saveMessages(savedMessages);
  }
  let agent = await buildAgent(savedMessages);

  if (initialMessage) {
    console.log(`\n💬 你: ${initialMessage}`);
    console.log(chalk.green.bold("\n🤖 AI:"));
    try {
      await sendAndPrint(agent, initialMessage);
      saveMessages(agent.messages);
      console.log("💾 已保存\n");
    } catch (err: any) { console.error(`\n❌ ${err.message}`); }
    return;
  }

  const msgCount = savedMessages.filter((m) => m.role !== "system").length;
  console.log(msgCount > 0
    ? `\n💬 继续上次对话 (${msgCount} 条，/${contextSize(savedMessages)} 字符，输入 /new 重新开始)\n`
    : "\n💬 air — 极简 AI 助手 (输入 /help 查看命令)\n");

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  function ask() {
    rl.question("💬 你: ", async (input) => {
      const t = input.trim();
      if (!t) { ask(); return; }

      if (t.startsWith("/")) {
        const c = t.toLowerCase();
        if (c === "/exit" || c === "/quit") { console.log("\n👋 再见！"); process.exit(0); }
        if (c === "/save") { console.log(`\n✅ 快照: ${saveSnapshot(savedMessages)}\n`); ask(); return; }
        if (c === "/new") { clearMessages(); savedMessages = [Message.System(SYSTEM_PROMPT)]; saveMessages(savedMessages); agent = await buildAgent(savedMessages); console.log("\n🆕 重新开始\n"); ask(); return; }
        if (c === "/help") { console.log("\n/exit /quit  退出\n/save        保存快照\n/new         重新开始\n/help        帮助\n"); ask(); return; }
        console.log(`\n❌ 未知命令: ${t}\n`); ask(); return; }

      console.log(chalk.green.bold("\n🤖 AI:"));
      try {
        await sendAndPrint(agent, t);
        saveMessages(agent.messages);

        if (shouldMigrate(agent.messages)) {
          console.log(`🔄 上下文 ${contextSize(agent.messages)}/${MAX_CONTEXT_CHARS}，准备迁移...`);
          try {
            const snap = saveSnapshot(agent.messages);
            console.log(`  💾 快照: ${snap}`);
            const summary = await generateMigrationDoc(agent.messages);
            savedMessages = [Message.System(SYSTEM_PROMPT), Message.User(summary)];
            saveMessages(savedMessages);
            agent = await buildAgent(savedMessages);
            console.log("✅ 迁移完成\n");
          } catch (err: any) { console.error(`❌ 迁移失败: ${err.message}\n`); }
        }
      } catch (err: any) { console.error(`\n❌ ${err.message}`); }
      ask();
    });
  }

  ask();
  process.on("SIGINT", () => { console.log("\n\n👋 再见！"); process.exit(0); });
}

// 重新导出 config 函数供 cli.ts 使用

export { readConfig, saveConfig };
