---
title: Getting Started
description: Install @ai-zen/air, configure the API Key, and run your first command
outline: deep
---

# Getting Started

This page takes you from zero to running air: installing, configuring the API Key, and issuing your first command.

## Requirements

- **Node.js**: needs to support ES Modules (`"type": "module"`); v18 or later is recommended.
- **DeepSeek API Key**: air only supports the DeepSeek model, so you need a key from `https://platform.deepseek.com/api_keys`.
- **Terminal**: the fallback terminal hook only supports `bash` / `zsh` (other features are not restricted by shell).

## Installation

### Global install (recommended)

```bash
npm install -g @ai-zen/air
```

### Build from source

```bash
git clone git@github.com:ai-zen/air.git
cd air
npm install
npm run build
npm install -g .
```

## Configure the API Key

```bash
air key sk-xxxxxxxxxxxxxxxx
```

`air key` writes the key into `config.json` under the data directory. If you run it the first time without setting a key, you'll be prompted to run `air key <your-key>` first.

## Run your first command

### One-shot message

Pass your text directly; air will use the shell tool to help you:

```bash
air use shell to list files in the current directory
```

### Interactive mode

Run with no arguments to enter an interactive session; it automatically resumes your last conversation:

```bash
air
```

Type `/exit` to quit. For all interactive commands, see [CLI Usage](./cli.md).

## View configuration

```bash
air config
# API Key: ****xxxx
```

`air config` masks the API Key, showing only the last four characters.

## Next steps

- [CLI Usage](./cli.md) — all command arguments, interactive commands, and the fallback hook
- [Core Concepts](./concepts.md) — single shell tool, file memory, and context migration
