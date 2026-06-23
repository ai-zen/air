import { describe, it, expect } from "vitest";
import { contextSize, shouldMigrate } from "../migration.js";

describe("contextSize", () => {
  it("空数组", () => {
    expect(contextSize([])).toBe(2);
  });

  it("一条消息", () => {
    const msgs = [{ role: "user", content: "你好" }];
    expect(contextSize(msgs)).toBe(JSON.stringify(msgs).length);
  });

  it("多条消息", () => {
    const msgs = [
      { role: "user", content: "你好" },
      { role: "assistant", content: "你好！有什么可以帮你的吗？" },
    ];
    expect(contextSize(msgs)).toBe(JSON.stringify(msgs).length);
  });
});

describe("shouldMigrate", () => {
  it("空消息不迁移", () => {
    expect(shouldMigrate([])).toBe(false);
  });

  it("小消息不迁移", () => {
    expect(shouldMigrate([{ role: "user", content: "hi" }])).toBe(false);
  });

  it("达到 66 万时迁移", () => {
    const n = 500000 - JSON.stringify([{ role: "user", content: "" }]).length;
    const bigMsg = { role: "user", content: "x".repeat(n) };
    expect(shouldMigrate([bigMsg])).toBe(true);
  });

  it("差一点不到时不迁移", () => {
    const n = 500000 - JSON.stringify([{ role: "user", content: "" }]).length - 1;
    const bigMsg = { role: "user", content: "x".repeat(n) };
    expect(shouldMigrate([bigMsg])).toBe(false);
  });
});
