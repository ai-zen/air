import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readConfig, saveConfig, readMessages, saveMessages, clearMessages, saveSnapshot, listSnapshots, loadSnapshot } from "../config.js";

describe("config", () => {
  let tempDir: string;
  let origHome: string | undefined;

  beforeEach(() => {
    tempDir = join(tmpdir(), `air-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
    origHome = process.env.HOME;
    process.env.HOME = tempDir;
  });

  afterEach(() => {
    if (origHome) process.env.HOME = origHome;
    else delete process.env.HOME;
    try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
  });

  describe("config (apiKey)", () => {
    it("默认 apiKey 为空", () => {
      expect(readConfig().apiKey).toBe("");
    });

    it("保存和读取 apiKey", () => {
      saveConfig("sk-test-key-12345");
      expect(readConfig().apiKey).toBe("sk-test-key-12345");
    });

    it("配置文件损坏时返回空 key", () => {
      mkdirSync(join(tempDir, ".ai-zen", "air"), { recursive: true });
      writeFileSync(join(tempDir, ".ai-zen", "air", "config.json"), "不是JSON", "utf-8");
      expect(readConfig().apiKey).toBe("");
    });
  });

  describe("context (messages 数组)", () => {
    it("不存在时返回空数组", () => {
      expect(readMessages()).toEqual([]);
    });

    it("保存和读取 messages", () => {
      const msgs = [
        { role: "user", content: "你好" },
        { role: "assistant", content: "你好！" },
      ];
      saveMessages(msgs);
      expect(readMessages()).toEqual(msgs);
    });

    it("clearMessages 清空为 []", () => {
      saveMessages([{ role: "user", content: "hi" }]);
      clearMessages();
      expect(readMessages()).toEqual([]);
    });

    it("文件内容不是数组时返回空数组", () => {
      mkdirSync(join(tempDir, ".ai-zen", "air"), { recursive: true });
      writeFileSync(join(tempDir, ".ai-zen", "air", "context.json"), '"不是数组"', "utf-8");
      expect(readMessages()).toEqual([]);
    });

    it("文件损坏时返回空数组", () => {
      mkdirSync(join(tempDir, ".ai-zen", "air"), { recursive: true });
      writeFileSync(join(tempDir, ".ai-zen", "air", "context.json"), "不是JSON", "utf-8");
      expect(readMessages()).toEqual([]);
    });
  });

  describe("snapshots", () => {
    it("保存快照，文件名是 ISO 时间", () => {
      const msgs = [{ role: "user", content: "测试快照" }];
      const name = saveSnapshot(msgs);
      expect(name).toBeTruthy();

      const snapDir = join(tempDir, ".ai-zen", "air", "snapshots");
      expect(existsSync(snapDir)).toBe(true);
      const files = readdirSync(snapDir).filter((f) => f.endsWith(".json"));
      expect(files.length).toBe(1);
      expect(files[0]).toBe(name + ".json");

      const loaded = JSON.parse(readFileSync(join(snapDir, files[0]), "utf-8"));
      expect(loaded).toEqual(msgs);
    });
  });


  describe("listSnapshots / loadSnapshot", () => {
    it("加载不存在的快照返回空数组", () => {
      expect(loadSnapshot("nonexistent")).toEqual([]);
    });

    it("保存后能列出并加载快照", () => {
      const msgs = [{ role: "user", content: "测试" }];
      const name = saveSnapshot(msgs);

      const list = listSnapshots();
      expect(list.length).toBe(1);
      expect(list[0].name).toBe(name);
      expect(list[0].date).toBeTruthy();

      const loaded = loadSnapshot(name);
      expect(loaded).toEqual(msgs);
    });
  });

});