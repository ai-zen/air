---
title: 快速开始
description: 安装 @ai-zen/air、配置 API Key、运行第一条命令
outline: deep
---

# 快速开始

本页带你从零开始跑起 air：安装、配置 API Key、发出第一条命令。

## 环境要求

- **Node.js**：需要支持 ES Module（`"type": "module"`），建议 v18 及以上。
- **DeepSeek API Key**：air 仅支持 DeepSeek 模型，需要在 `https://platform.deepseek.com/api_keys` 获取。
- **终端**：兜底终端钩子仅支持 `bash` / `zsh`（其余功能不限制 shell）。

## 安装

### 全局安装（推荐）

```bash
npm install -g @ai-zen/air
```

### 从源码构建

```bash
git clone git@github.com:ai-zen/air.git
cd air
npm install
npm run build
npm install -g .
```

## 配置 API Key

```bash
air key sk-xxxxxxxxxxxxxxxx
```

`air key` 会把 Key 写入数据目录下的 `config.json`。首次运行若未设置 Key，会提示先执行 `air key <your-key>`。

## 运行第一条命令

### 一次性消息

直接传入文字，air 会用 shell 工具帮你执行：

```bash
air 用 shell 列出当前目录的文件
```

### 交互模式

不带参数进入交互式会话，会自动恢复上次对话：

```bash
air
```

输入 `/exit` 退出。关于全部交互命令见 [CLI 使用](./cli.md)。

## 查看配置

```bash
air config
# API Key: ****xxxx
```

`air config` 会打码显示 API Key 的后四位。

## 下一步

- [CLI 使用](./cli.md) —— 全部命令参数、交互命令与兜底钩子
- [核心概念](./concepts.md) —— 单 shell 工具、文件记忆与上下文迁移
