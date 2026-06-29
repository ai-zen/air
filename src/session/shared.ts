import { Agent, Message } from "@ai-zen/agents-core";
import inquirer from "inquirer";
import { saveMessages } from "../config.js";
import { buildAgent } from "../agent-factory.js";
import { handleMessage } from "./message.js";
import { cmdExit } from "./commands/exit.js";
import { cmdHelp } from "./commands/help.js";
import { cmdSave } from "./commands/save.js";
import { cmdNew } from "./commands/new.js";
import { cmdLoad } from "./commands/load.js";
import { cmdEditor } from "./commands/editor.js";
import { cmdBack } from "./commands/back.js";

export interface SessionCtx {
  agent: Agent;
}

export const SYSTEM_PROMPT = [
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

export async function saveAndNew(ctx: SessionCtx): Promise<void> {
  const msgs = [Message.System(SYSTEM_PROMPT)];
  saveMessages(msgs);
  ctx.agent = await buildAgent(msgs);
}

async function dispatchCommand(ctx: SessionCtx, cmd: string): Promise<void> {
  switch (cmd) {
    case "/exit":
    case "/quit":
      cmdExit(ctx);
      break;
    case "/save":
      await cmdSave(ctx);
      break;
    case "/new":
      await cmdNew(ctx);
      break;
    case "/load":
      await cmdLoad(ctx);
      break;
    case "/back":
      await cmdBack(ctx);
      break;
    case "/editor":
      await cmdEditor(ctx);
      break;
    case "/help":
      cmdHelp();
      break;
    default:
      console.log(`\n❌ 未知命令: ${cmd}\n`);
      break;
  }
}

export async function ask(ctx: SessionCtx) {
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
