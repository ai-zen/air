import { Agent, Message, OpenAI, ChatGPT } from "@ai-zen/agents-core";
import type { AgentNS } from "@ai-zen/agents-core";
import { readConfig } from "./config.js";
import { shellTool } from "./tools.js";

const MODEL_NAME = "deepseek-v4-flash";
const API_ENDPOINT = process.env.AIR_API_ENDPOINT || "https://api.deepseek.com/v1";

async function buildModel(apiKey: string) {
  const endpoint = new OpenAI({ openai_endpoint: API_ENDPOINT, api_key: apiKey });
  return new ChatGPT({
    model_config: {},
    request_config: await endpoint.chatCompletion(MODEL_NAME),
  });
}

export async function buildAgent(savedMessages: any[]): Promise<Agent> {
  const config = readConfig();
  const model = await buildModel(config.apiKey);
  const messages: AgentNS.Message[] = [];
  for (const m of savedMessages) messages.push(new Message(m));
  return new Agent({ model, messages, tools: [shellTool] });
}
