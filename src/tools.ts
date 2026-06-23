import { CallbackTool } from "@ai-zen/agents-core";
import { execSync } from "node:child_process";

export const shellTool = new CallbackTool({
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
