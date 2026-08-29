---
title: 核心概念
description: 单 shell 工具、文件系统记忆、自动上下文迁移与内置行为准则
outline: deep
---

# 核心概念

air 的设计刻意精简。理解以下四个概念，就能掌握它的全部工作方式。

## 单个 shell 工具

air 只给模型暴露**一个**工具：`shell`。

```ts
// src/tools.ts（简化）
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
  callback(_this, args) {
    return execSync(args.command, { encoding: "utf-8", timeout: 30000 });
  },
});
```

- 参数只有一个：`command`（字符串）。
- 底层用 `execSync` 同步执行，**30 秒超时**。
- 执行出错时，会把错误信息包装成字符串返回，不会中断对话。

所有「执行命令、读写文件、管理项目」的动作都经由这个工具完成。

## 文件系统记忆

air **不内置额外的记忆持久化**，而是把记忆责任交给 AI 和文件系统。

系统提示要求 AI 将需要长期记住的信息（用户偏好、项目约定、任务进度等）写入：

- 全局记忆：`~/.ai-zen/air/memory/*.md`
- 项目记忆：`$(cwd)/.ai-zen/air/memory/*.md`

下次启动时，AI 通过 `shell` 读取这些文件即可恢复记忆。这是它**唯一的记忆方式**。

> 注意：上面「项目记忆」路径来自系统提示词约定，代码本身并不强制创建或验证该路径下的文件；实际落盘位置以 AI 行为为准。

## 自动上下文迁移

当对话消息的 JSON 序列化长度达到阈值时，air 自动迁移：

- 阈值：`MAX_CONTEXT_CHARS = 500000`（50 万字符）。
- 计数：`contextSize(messages) = JSON.stringify(messages).length`。
- 触发：`contextSize >= MAX_CONTEXT_CHARS`。

迁移流程（`agent-runtime.ts` 的 `handleMessage`）：

1. 先**保存快照**到 `snapshots/`；
2. 再让模型（`generateMigrationDoc`，使用同一个 DeepSeek 模型）读取完整对话历史，生成一份**交接文档**；
3. 用 `[System(SYSTEM_PROMPT), User(summary)]` 重建上下文；
4. 继续后续对话。

交接文档用于让新会话了解任务背景，包含对话断点、已完成/未完成任务、重要记忆、文件索引与接手指令。

## 内置行为准则

系统提示（`agent-constants.ts`）要求 AI 遵循以下原则：

1. **先商量再动手**：做任何改动前必须先与用户商量，获得书面确认。
2. **不擅自产出文件**：未明确要求时，不自行创建文件到项目。
3. **危险操作需确认**：删除/覆盖文件、安装卸载软件、改系统配置、耗时任务等，需说明风险并获得书面确认。
4. **追责原则**：每一步均以用户书面确认为依据，最终责任由用户承担。

## 模型与端点

- 模型硬编码为 `deepseek-v4-flash`（`agent-factory.ts`）。
- API 端点默认 `https://api.deepseek.com/v1`，可由 `AIR_API_ENDPOINT` 覆盖。

## 相关主题

- [快速开始](./getting-started.md) —— 安装与运行
- [CLI 使用](./cli.md) —— 命令、交互会话与钩子
