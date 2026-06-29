import inquirer from "inquirer";
import type { ChatCtx } from "../agent-types.js";
import { saveMessages } from "../config.js";

export async function cmdEditor(ctx: ChatCtx) {
  const { content } = await inquirer.prompt([
    { type: "editor", name: "content", message: "编辑消息:" },
  ]);
  if (!content.trim()) {
    console.log("\n已取消\n");
    return;
  }
  try {
    await ctx.send(content.trim());
    saveMessages(ctx.agent.messages);
  } catch (err: any) { console.error(`\n❌ ${err.message}`); }
}
