---
title: air
description: 极简 AI 命令行助手——单 shell 工具 + 文件系统记忆 + 自动上下文迁移
outline: deep
---

# air

> Do 99% of things with 1% of the features.

`@ai-zen/air` 是一个**极简的 AI 命令行助手**。它刻意保持功能极小、可控：只有一个 `shell` 工具，AI 通过它执行命令、读写文件；记忆直接落到文件系统；上下文满了自动做任务迁移。

## 它解决什么问题

很多 AI 助手堆砌大量工具、插件与持久化机制，复杂且难以掌控。air 反向操作——**用 1% 的功能去完成 99% 的事情**：

- 把「执行命令、读写文件」全部收敛到**一个 `shell` 工具**；
- 把「长期记忆」交给**文件系统**，由 AI 自己决定记什么；
- 把「上下文超长」问题交给**自动迁移**，无需人工干预。

## 核心特性

- **单个 shell 工具**：AI 只依赖一个 `shell` 工具，通过 `execSync` 执行命令并回传输出（30 秒超时）。
- **文件系统记忆**：AI 按系统提示将需要长期记住的内容写入 `~/.ai-zen/air/memory/*.md`，下次启动读取。air 不做额外持久化。
- **自动上下文迁移**：当消息 JSON 序列化后超过 500,000 字符时，自动拍快照并让模型生成交接文档，用摘要重建上下文。
- **兜底终端钩子**：可选安装，shell 中不存在的命令会自动转发给 air。
- **交互式会话**：支持 `/save`、`/load`、`/new`、`/back`、`/editor` 等命令。

## 快速体验

```bash
npm install -g @ai-zen/air
air key sk-xxxxxxxx
air 用 shell 查看当前目录有哪些文件
```

完整流程见 [快速开始](./getting-started.md) 与 [CLI 使用](./cli.md)。

## 设计理念

- **模型**只用一个：DeepSeek-V4-Flash（源码中写死）。
- **记忆**不是「要么存要么忘」，而是让 AI 依据系统提示自行决定写入 `memory/*.md`。
- **上下文**无需用户操心：达到阈值即自动迁移，迁移前先保存快照。
- **行为准则**内置在系统提示中：先商量再动手，危险操作需用户书面确认。

涉及上下文、记忆与迁移的具体机制，见 [核心概念](./concepts.md)。

## 项目结构

```text
src/
├── cli.ts                # CLI 入口，commander
├── config.ts             # 配置、上下文、快照读写
├── delta-renderer.ts     # 流式渲染器
├── hook.ts               # 兜底终端钩子（install/uninstall）
├── migration.ts          # 上下文计数与迁移
├── tools.ts              # 工具定义——shell
├── agent-factory.ts      # Agent 工厂——构建模型与 Agent
├── agent-runtime.ts      # 核心运行时——send、chat loop
├── agent-types.ts        # 类型定义（ChatCtx 等）
├── agent-constants.ts    # 系统提示词与常量
└── agent-commands/       # 交互命令处理
    ├── index.ts          # dispatchCommand() — 命令分发入口
    ├── back.ts           # /back — 撤回消息
    ├── editor.ts         # /editor — 多行编辑器输入
    ├── exit.ts           # /exit — 退出
    ├── help.ts           # /help
    ├── load.ts           # /load — 加载快照
    ├── new.ts            # /new — 新会话
    └── save.ts           # /save — 保存快照
```
