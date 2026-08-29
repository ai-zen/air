---
title: CLI Usage
description: air command-line arguments, interactive session commands, and the fallback terminal hook
outline: deep
---

# CLI Usage

This section summarizes air's global commands, interactive session commands, fallback terminal hook, and environment variables.

## Global commands

| Command | Description |
|---------|-------------|
| `air key <apiKey>` | Set the DeepSeek API Key |
| `air config` | View the current configuration (API Key masked) |
| `air hook <install\|uninstall>` | Install / uninstall the fallback terminal hook |
| `air [message...]` | Send a message; with no arguments, enter interactive mode |
| `air --version` | Show the current version |

### Set the API Key

```bash
air key sk-xxxxxxxx
```

### View configuration

```bash
air config
# API Key: ****xxxx
```

### One-shot message / interactive mode

```bash
# One-shot message
air use shell to list the files in the current directory

# Interactive mode (auto-resumes your last conversation)
air
```

In interactive mode, if existing history is detected, you'll see: `Continue last conversation (N messages, /X chars, type /new to start fresh)`.

## Interactive session commands

Once in interactive mode, input beginning with `/` is treated as a command:

| Command | Description |
|---------|-------------|
| `/exit` `/quit` | Exit |
| `/save` | Save a snapshot |
| `/load` | Load a snapshot |
| `/new` | Clear the context and start fresh |
| `/back` | Recall a message (optionally edit and resend) |
| `/editor` | Open the system editor for multi-line input |
| `/help` | Help |

> Note: `/editor` and `/quit` are both available in command dispatch, but the help text for `/help` does not list `/editor` (source: `agent-commands/help.ts`).

## Fallback terminal hook

When a command doesn't exist in your shell, the hook forwards it to air so the AI can interpret your intent:

```bash
$ gred "hello" file.txt
# → command not found → auto-forwarded to air
# → AI: "Did you mean grep?"
```

```bash
# Install
air hook install

# Uninstall
air hook uninstall
```

After installing, you need to restart the terminal or `source` the corresponding rc file for it to take effect. The hook writes to `~/.zshrc` or `~/.bashrc` (bash / zsh only). On uninstall it removes the block cleanly via markers, without affecting the rest of the file.

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AIR_DIR` | Override the data directory | `~/.ai-zen/air` |
| `AIR_API_ENDPOINT` | Override the model API endpoint | `https://api.deepseek.com/v1` |

## Data directory

```text
~/.ai-zen/air/
├── config.json       # { "apiKey": "sk-xxx" }
├── context.json      # [ { role, content }, ... ]    Current conversation
├── snapshots/        # Auto snapshots before migration or on /save
└── memory/           # Long-term memory written by the AI (*.md)
```

The directory can be redirected by `AIR_DIR`. For memory and migration, see [Core Concepts](./concepts.md).
