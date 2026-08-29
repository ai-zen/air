---
title: Core Concepts
description: Single shell tool, filesystem memory, automatic context migration, and built-in behavior rules
outline: deep
---

# Core Concepts

air's design is deliberately minimal. Understanding the following four concepts gives you the full picture of how it works.

## A single shell tool

air exposes only **one** tool to the model: `shell`.

```ts
// src/tools.ts (simplified)
export const shellTool = new CallbackTool({
  function: {
    name: "shell",
    description: "Execute a shell command and return its output",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "The command to execute" },
      },
      required: ["command"],
    },
  },
  callback(_this, args) {
    return execSync(args.command, { encoding: "utf-8", timeout: 30000 });
  },
});
```

- There is only one parameter: `command` (a string).
- Under the hood it executes synchronously with `execSync`, with a **30-second timeout**.
- If execution fails, the error message is wrapped as a string and returned, rather than interrupting the conversation.

All actions — "run a command, read/write a file, manage a project" — go through this one tool.

## Filesystem memory

air does **not** include any additional persistence for memory; instead, it delegates the responsibility to the AI and the filesystem.

The system prompt asks the AI to write information that needs to be remembered long-term (user preferences, project conventions, task progress, etc.) to:

- Global memory: `~/.ai-zen/air/memory/*.md`
- Project memory: `$(cwd)/.ai-zen/air/memory/*.md`

On the next startup, the AI reads these files via `shell` to restore its memory. This is its **only way of remembering**.

> Note: the "project memory" path above comes from the system prompt convention; the code itself does not force-create or validate files under that path, so the actual on-disk location follows the AI's behavior.

## Automatic context migration

When the JSON serialization length of the conversation messages reaches a threshold, air migrates automatically:

- Threshold: `MAX_CONTEXT_CHARS = 500000` (500K characters).
- Counting: `contextSize(messages) = JSON.stringify(messages).length`.
- Trigger: `contextSize >= MAX_CONTEXT_CHARS`.

Migration flow (`handleMessage` in `agent-runtime.ts`):

1. First **save a snapshot** to `snapshots/`;
2. Then have the model (`generateMigrationDoc`, using the same DeepSeek model) read the full conversation history and produce a **handoff document**;
3. Rebuild the context with `[System(SYSTEM_PROMPT), User(summary)]`;
4. Continue the conversation.

The handoff document lets the new session understand the task background, including the conversation breakpoint, completed/incomplete tasks, important memories, a file index, and handover instructions.

## Built-in behavior rules

The system prompt (`agent-constants.ts`) requires the AI to follow these principles:

1. **Discuss before acting**: before making any change, discuss it with the user and obtain written confirmation.
2. **Don't produce files on your own**: when not explicitly requested, do not create files in the project on your own.
3. **Dangerous operations need confirmation**: deleting/overwriting files, installing/uninstalling software, changing system configuration, long-running tasks, etc., require explaining the risks and obtaining explicit written confirmation.
4. **Accountability principle**: every step is grounded in the user's written confirmation, and the final responsibility rests with the user.

## Model & endpoint

- The model is hardcoded as `deepseek-v4-flash` (`agent-factory.ts`).
- The API endpoint defaults to `https://api.deepseek.com/v1`, overridable by `AIR_API_ENDPOINT`.

## Related topics

- [Getting Started](./getting-started.md) — installation and running
- [CLI Usage](./cli.md) — commands, interactive session, and the hook
