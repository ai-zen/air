import chalk from "chalk";
import { Agent } from "@ai-zen/agents-core";
import { DeltaRenderer } from "../delta-renderer.js";
import type { AgentNS } from "@ai-zen/agents-core";

export async function sendAndPrint(agent: Agent, text: string): Promise<void> {
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
