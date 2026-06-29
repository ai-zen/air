import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ==================== Helpers ====================

const CLI = join(process.cwd(), "dist", "cli.js");

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function runCli(args: string[], stdinInput?: string, extraEnv?: Record<string, string>): Promise<CliResult> {
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      ...extraEnv,
    };

    const proc = spawn("node", [CLI, ...args], { env, stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    if (stdinInput !== undefined) {
      proc.stdin.write(stdinInput);
      proc.stdin.end();
    }

    proc.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? -1 });
    });
    proc.on("error", () => {
      resolve({ stdout, stderr, exitCode: -1 });
    });
  });
}

let tmpDirs: string[] = [];

afterAll(() => {
  for (const d of tmpDirs) {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
});

function makeTestDir(): string {
  const dir = join(tmpdir(), `air-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  tmpDirs.push(dir);
  return dir;
}

// Read API key from .env.local
function getApiKey(): string {
  try {
    const envContent = readFileSync(join(process.cwd(), ".env.local"), "utf-8");
    const match = envContent.match(/DEEPSEEK_API_KEY=(.+)/);
    if (match) return match[1].trim();
  } catch {}
  return process.env.DEEPSEEK_API_KEY || "";
}

const API_KEY = getApiKey();

function skipIfNoKey(ctx: any) {
  if (!API_KEY) ctx.skip();
}

// ==================== Tests ====================

describe("E2E: CLI 基本功能", () => {
  it("air --help 显示帮助信息", async () => {
    const result = await runCli(["--help"]);
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("air");
    expect(result.exitCode).toBe(0);
  });

  it("air key <key> 设置 API Key", async () => {
    const airDir = makeTestDir();
    const result = await runCli(["key", "sk-test-12345"], undefined, { AIR_DIR: airDir });
    expect(result.stdout).toContain("✅ API Key 已设置");

    const configFile = join(airDir, "config.json");
    expect(existsSync(configFile)).toBe(true);
    const config = JSON.parse(readFileSync(configFile, "utf-8"));
    expect(config.apiKey).toBe("sk-test-12345");
  });

  it("air config 显示配置信息", async () => {
    const airDir = makeTestDir();
    await runCli(["key", "sk-test-abcde"], undefined, { AIR_DIR: airDir });
    const result = await runCli(["config"], undefined, { AIR_DIR: airDir });
    expect(result.stdout).toContain("API Key:");
    expect(result.stdout).toContain("bcde");
  });
});


describe("E2E: 对话命令", () => {
  it("/save 保存快照", async (ctx) => {
    skipIfNoKey(ctx);

    const airDir = makeTestDir();
    const env = { AIR_DIR: airDir };
    await runCli(["key", API_KEY], undefined, env);

    // 先发一条消息建立历史
    await runCli(["测试消息"], "/exit\n", env);

    // 交互模式下 /save 后 /exit
    const result = await runCli([], "/save\n/exit\n", env);
    expect(result.stdout).toContain("✅ 快照:");

    // 验证快照文件被创建
    const snapDir = join(airDir, "snapshots");
    const files = readdirSync(snapDir).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(1);
  }, 30000);
});

describe("E2E: 真实 API 对话", () => {
  it("air <message> 发送消息并接收真实回复", async (ctx) => {
    skipIfNoKey(ctx);

    const airDir = makeTestDir();
    const env = { AIR_DIR: airDir };

    // Set up real key
    await runCli(["key", API_KEY], undefined, env);

    // Send a simple message, pipe /exit to leave interactive mode
    const result = await runCli(["用一句话介绍你自己"], "/exit\n", env);

    // Should have AI response
    expect(result.stdout).toContain("🤖 AI:");
    // Should have some actual content (not empty)
    expect(result.stdout.length).toBeGreaterThan(100);

    // Verify context was saved with user message + AI response
    const contextFile = join(airDir, "context.json");
    expect(existsSync(contextFile)).toBe(true);
    const msgs = JSON.parse(readFileSync(contextFile, "utf-8"));
    expect(msgs.length).toBeGreaterThanOrEqual(2);
    expect(msgs[1].role).toBe("user");
    expect(msgs[1].content).toBe("用一句话介绍你自己");

    // Verify there's an assistant response
    const assistantMsg = msgs.find((m: any) => m.role === "assistant");
    expect(assistantMsg).toBeTruthy();
    expect(assistantMsg.content.length).toBeGreaterThan(10);
  }, 30000);  // 30s timeout for real API

  it("/new 命令重置对话", async (ctx) => {
    skipIfNoKey(ctx);

    const airDir = makeTestDir();
    const env = { AIR_DIR: airDir };

    await runCli(["key", API_KEY], undefined, env);

    // Send a message to create history
    await runCli(["第一轮消息"], "/exit\n", env);

    // Verify there's history
    let contextFile = join(airDir, "context.json");
    let msgs = JSON.parse(readFileSync(contextFile, "utf-8"));
    expect(msgs.length).toBeGreaterThanOrEqual(2);

    // Interactive mode: /new then exit
    const result = await runCli([], "/new\n/exit\n", env);
    expect(result.stdout).toContain("🆕 重新开始");

    // Verify context was reset
    msgs = JSON.parse(readFileSync(contextFile, "utf-8"));
    expect(msgs.length).toBe(1);
    expect(msgs[0].role).toBe("system");
  }, 30000);
});
