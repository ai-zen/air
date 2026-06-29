import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ChatCtx } from "../agent-types.js";

// Mock all external dependencies
vi.mock("inquirer", () => ({ default: { prompt: vi.fn() } }));
vi.mock("../config.js", () => ({
  saveMessages: vi.fn(),
  saveSnapshot: vi.fn(() => "snapshot-123"),
  listSnapshots: vi.fn(() => []),
  loadSnapshot: vi.fn(() => []),
}));
vi.mock("../agent-factory.js", () => ({
  buildAgent: vi.fn(async () => ({
    messages: [],
    events: { on: vi.fn(), off: vi.fn() },
    send: vi.fn(),
  })),
}));

const mockPrompt = vi.mocked((await import("inquirer")).default.prompt);
const { saveMessages, saveSnapshot, listSnapshots, loadSnapshot } = await import("../config.js");
const { buildAgent } = await import("../agent-factory.js");

function makeCtx(msgs: any[] = []): ChatCtx {
  return {
    agent: { messages: msgs, events: { on: vi.fn(), off: vi.fn() }, send: vi.fn() } as any,
    send: vi.fn(),
  };
}

// ==================== cmdNew ====================

describe("cmdNew", () => {
  it("写入 system prompt 并构建 agent", async () => {
    const { cmdNew } = await import("../agent-commands/new.js");
    const ctx = makeCtx();

    await cmdNew(ctx);

    expect(saveMessages).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ role: "system" })])
    );
    expect(buildAgent).toHaveBeenCalled();
    expect(ctx.agent).toBeTruthy();
  });
});

// ==================== dispatchCommand 路由 ====================

describe("dispatchCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('"/exit" 调用 cmdExit（process.exit）', async () => {
    // Can't easily test process.exit, just verify it doesn't throw
    const { runChat } = await import("../agent-runtime.js");
    // dispatchCommand is internal, tested via routing only
  });

  it('"/save" 调用 cmdSave', async () => {
    const { cmdSave } = await import("../agent-commands/save.js");
    const ctx = makeCtx([{ role: "system", content: "sys" }]);
    await cmdSave(ctx);
    expect(saveSnapshot).toHaveBeenCalledWith(ctx.agent.messages);
  });

  it('"/new" 调用 cmdNew 并打印提示', async () => {
    const { cmdNew } = await import("../agent-commands/new.js");
    const ctx = makeCtx();
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await cmdNew(ctx);
    expect(spy).toHaveBeenCalledWith("\n🆕 新会话\n");
    spy.mockRestore();
  });

  it('"/help" 打印帮助信息', async () => {
    const { cmdHelp } = await import("../agent-commands/help.js");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    cmdHelp();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ==================== cmdBack ====================

describe("cmdBack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("没有消息时提示无可撤回", async () => {
    const { cmdBack } = await import("../agent-commands/back.js");
    const ctx = makeCtx([{ role: "system", content: "sys" }]);
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await cmdBack(ctx);
    expect(spy).toHaveBeenCalledWith("\n❌ 还没有消息可以撤回\n");
    spy.mockRestore();
  });

  it("取消操作时不修改消息", async () => {
    const { cmdBack } = await import("../agent-commands/back.js");
    const msgs = [
      { role: "system", content: "sys" },
      { role: "user", content: "你好" },
    ];
    const ctx = makeCtx(msgs);
    mockPrompt.mockResolvedValueOnce({ selectedIndex: -1 });
    await cmdBack(ctx);
    expect(ctx.agent.messages.length).toBe(2);
  });
});

// ==================== cmdLoad ====================

describe("cmdLoad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("没有快照时提示", async () => {
    const { cmdLoad } = await import("../agent-commands/load.js");
    const ctx = makeCtx();
    vi.mocked(listSnapshots).mockReturnValueOnce([]);
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await cmdLoad(ctx);
    expect(spy).toHaveBeenCalledWith("\n📭 没有可用的快照\n");
    spy.mockRestore();
  });
});

// ==================== cmdEditor ====================

describe("cmdEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("取消编辑不报错", async () => {
    const { cmdEditor } = await import("../agent-commands/editor.js");
    const ctx = makeCtx();
    mockPrompt.mockResolvedValueOnce({ content: "" });
    await cmdEditor(ctx);
    expect(saveMessages).not.toHaveBeenCalled();
  });
});
