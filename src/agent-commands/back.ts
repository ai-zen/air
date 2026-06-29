import inquirer from "inquirer";
import type { ChatCtx } from "../agent-types.js";
import { saveMessages } from "../config.js";
import { buildAgent } from "../agent-factory.js";

export async function cmdBack(ctx: ChatCtx): Promise<void> {
  const targets: { index: number; role: string; label: string; preview: string }[] = [];
  for (let i = 0; i < ctx.agent.messages.length; i++) {
    const msg = ctx.agent.messages[i];
    if (msg.role === "user") {
      const text = typeof msg.content === "string" ? msg.content : "";
      if (text) {
        targets.push({ index: i, role: "user", label: "\u{1F464} 用户", preview: text.substring(0, 60) + (text.length > 60 ? "..." : "") });
      }
    } else if (msg.role === "tool" || msg.role === "function") {
      const text = typeof msg.content === "string" ? msg.content : "";
      if (text) {
        targets.push({ index: i, role: msg.role, label: "\u{1F527} 工具", preview: text.substring(0, 60) + (text.length > 60 ? "..." : "") });
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
        { name: "\u21a9\ufe0f  取消操作", value: -1 },
        ...targets.map((t) => ({ name: t.label + " " + t.preview, value: t.index })),
      ],
    },
  ]);

  if (selectedIndex === -1) { console.log("\n已取消\n"); return; }

  const selectedMsg = ctx.agent.messages[selectedIndex];
  const isUserMsg = selectedMsg.role === "user";
  const originalText = typeof selectedMsg.content === "string" ? selectedMsg.content : "";
  const sliceEnd = isUserMsg ? selectedIndex : selectedIndex + 1;
  ctx.agent.messages = ctx.agent.messages.slice(0, sliceEnd);

  if (isUserMsg) {
    console.log("\n原内容: " + originalText.substring(0, 200) + (originalText.length > 200 ? "..." : "") + "\n");
    const { editChoice } = await inquirer.prompt([
      {
        type: "list",
        name: "editChoice",
        message: "请选择:",
        choices: [
          { name: "\u270f\ufe0f  修改后重新发送", value: "edit" },
          { name: "\u{1F504} 直接重新发送", value: "resend" },
          { name: "\u21a9\ufe0f  取消操作", value: "cancel" },
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

    ctx.agent = await buildAgent(ctx.agent.messages);
    await ctx.send(textToSend);
    saveMessages(ctx.agent.messages);
  } else {
    console.log("\n💡 请输入一条新消息继续对话\n");
    const { newMessage } = await inquirer.prompt([
      { type: "input", name: "newMessage", message: "新消息:" },
    ]);
    if (!newMessage.trim()) { console.log("\n已取消\n"); return; }
    ctx.agent = await buildAgent(ctx.agent.messages);
    await ctx.send(newMessage.trim());
    saveMessages(ctx.agent.messages);
  }
}
