---
title: CLI 使用
description: air 命令行参数、交互会话命令与兜底终端钩子
outline: deep
---

# CLI 使用

本节汇总 air 的全局命令、交互会话命令、兜底终端钩子与环境变量。

## 全局命令

| 命令 | 说明 |
|------|------|
| `air key <apiKey>` | 设置 DeepSeek API Key |
| `air config` | 查看当前配置（API Key 打码显示） |
| `air hook <install\|uninstall>` | 安装 / 卸载兜底终端钩子 |
| `air [message...]` | 发送一条消息；不传参数则进入交互模式 |
| `air --version` | 显示当前版本 |

### 设置 API Key

```bash
air key sk-xxxxxxxx
```

### 查看配置

```bash
air config
# API Key: ****xxxx
```

### 一次性消息 / 交互模式

```bash
# 一次性消息
air 用 shell 帮我看看当前目录有哪些文件

# 交互模式（自动恢复上次对话）
air
```

交互模式若检测到已有历史，会提示：`继续上次对话 (N 条，/X 字符，输入 /new 重新开始)`。

## 交互会话命令

进入交互模式后，以 `/` 开头的输入会被当作命令处理：

| 命令 | 说明 |
|------|------|
| `/exit` `/quit` | 退出 |
| `/save` | 保存快照 |
| `/load` | 加载快照 |
| `/new` | 清空上下文重新开始 |
| `/back` | 撤回消息（可选修改后重发） |
| `/editor` | 打开系统编辑器输入多行文本 |
| `/help` | 帮助 |

> 说明：`/editor`、`/quit` 在命令分发中均可用，但 `/help` 的帮助文本未列出 `/editor`（源码 `agent-commands/help.ts`）。

## 兜底终端钩子

当 shell 中某个命令不存在时，钩子会把该命令自动转发给 air，让 AI 解读你的意图：

```bash
$ gred "hello" file.txt
# → command not found → 自动转发到 air
# → AI: "你是不是想用 grep？"
```

```bash
# 安装
air hook install

# 卸载
air hook uninstall
```

安装后需重启终端或 `source` 对应的 rc 文件生效。钩子会写入 `~/.zshrc` 或 `~/.bashrc`（仅支持 bash / zsh）。卸载时会按标记块干净移除，不影响文件其余内容。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `AIR_DIR` | 覆盖数据目录 | `~/.ai-zen/air` |
| `AIR_API_ENDPOINT` | 覆盖模型 API 端点 | `https://api.deepseek.com/v1` |

## 数据目录

```text
~/.ai-zen/air/
├── config.json       # { "apiKey": "sk-xxx" }
├── context.json      # [ { role, content }, ... ]    当前对话
├── snapshots/        # /save 或迁移前自动快照
└── memory/           # AI 自己写入的长期记忆 (*.md)
```

目录由 `AIR_DIR` 指定时可被重定向。关于记忆与迁移见 [核心概念](./concepts.md)。
