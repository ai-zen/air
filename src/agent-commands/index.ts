import type { ChatCtx } from "../agent-types.js";
import { cmdExit } from "./exit.js";
import { cmdHelp } from "./help.js";
import { cmdSave } from "./save.js";
import { cmdNew } from "./new.js";
import { cmdLoad } from "./load.js";
import { cmdEditor } from "./editor.js";
import { cmdBack } from "./back.js";

export async function dispatchCommand(ctx: ChatCtx, cmd: string): Promise<void> {
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
