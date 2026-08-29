---
title: air
description: Minimalist AI CLI assistant — one shell tool + filesystem memory + automatic context migration
outline: deep
---

# air

> Do 99% of things with 1% of the features.

`@ai-zen/air` is a **minimalist AI CLI assistant**. It deliberately stays tiny and controllable: there is only one `shell` tool, through which the AI runs commands and reads/writes files; memory is written directly to the filesystem; and when the context gets too long it automatically migrates the task.

## What problem it solves

Many AI assistants pile up a large number of tools, plugins, and persistence mechanisms — complex and hard to control. air does the opposite — **it uses 1% of the features to accomplish 99% of the work**:

- Collapses "run commands, read/write files" all into **a single `shell` tool**;
- Hands "long-term memory" over to the **filesystem**, letting the AI decide what to remember;
- Hands "context too long" over to **automatic migration**, with no human intervention.

## Core features

- **A single shell tool**: the AI relies on only one `shell` tool, which executes commands via `execSync` and reports back the output (30-second timeout).
- **Filesystem memory**: the AI writes anything it needs to remember long-term (per the system prompt) into `~/.ai-zen/air/memory/*.md`, and reads it on the next startup. air does no additional persistence.
- **Automatic context migration**: when the JSON serialization of the messages exceeds 500,000 characters, air automatically takes a snapshot and asks the model to generate a handoff document, then rebuilds the context from the summary.
- **Fallback terminal hook**: optionally installable; commands that don't exist in your shell are automatically forwarded to air.
- **Interactive session**: supports `/save`, `/load`, `/new`, `/back`, `/editor` and other commands.

## Quick experience

```bash
npm install -g @ai-zen/air
air key sk-xxxxxxxx
air use shell to list files in the current directory
```

See [Getting Started](./getting-started.md) and [CLI Usage](./cli.md) for the full workflow.

## Design philosophy

- **Only one model**: DeepSeek-V4-Flash (hardcoded in the source).
- **Memory** is not "either store or forget" — the AI decides, per the system prompt, whether to write to `memory/*.md`.
- **Context** needs no user attention: once the threshold is reached it migrates automatically, saving a snapshot first.
- **Behavior rules** are built into the system prompt: discuss before acting; dangerous operations require explicit written confirmation from the user.

For the specific mechanisms around context, memory, and migration, see [Core Concepts](./concepts.md).

## Project structure

```text
src/
├── cli.ts                # CLI entry, commander
├── config.ts             # Config, context, snapshot read/write
├── delta-renderer.ts     # Stream renderer
├── hook.ts               # Fallback terminal hook (install/uninstall)
├── migration.ts          # Context counting & migration
├── tools.ts              # Tool definitions — shell
├── agent-factory.ts      # Agent factory — build model & agent
├── agent-runtime.ts      # Core runtime — send, chat loop
├── agent-types.ts        # Type definitions (ChatCtx, etc.)
├── agent-constants.ts    # System prompt & constants
└── agent-commands/       # Interactive command handlers
    ├── index.ts          # dispatchCommand() — command router
    ├── back.ts           # /back — recall & resend
    ├── editor.ts         # /editor — multi-line input
    ├── exit.ts           # /exit — quit
    ├── help.ts           # /help
    ├── load.ts           # /load — load snapshot
    ├── new.ts            # /new — new session
    └── save.ts           # /save — save snapshot
```
