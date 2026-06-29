import { Agent } from "@ai-zen/agents-core";

export interface ChatCtx {
  agent: Agent;
  send: (text: string) => Promise<void>;
}
