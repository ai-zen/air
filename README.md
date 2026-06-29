# air

> Do 99% of things with 1% of the features.

A minimalist AI CLI assistant. Just one shell tool — the AI remembers things by writing to the filesystem, and automatically migrates context when it gets too long.

## Installation

```bash
# Global install (recommended)
npm install -g @ai-zen/air

# Or build from source
git clone git@github.com:ai-zen/air.git
cd air
npm install
npm run build
npm install -g .
```

## Usage

```bash
# Set API Key (DeepSeek)
air key sk-xxxxxxxxxxxxxxxx

# Interactive mode (auto-resumes last conversation)
air

# One-shot message
air use shell to list files in current directory

# View config
air config

# Install fallback hook (redirects unknown commands to air)
air hook install

# Uninstall fallback hook
air hook uninstall
```

### Interactive Commands

| Command | Description |
|---------|-------------|
| `/exit` `/quit` | Exit |
| `/save` | Save snapshot |
| `/load` | Load snapshot |
| `/new` | Clear context and start fresh |
| `/back` | Recall a message (optionally edit and resend) |
| `/editor` | Open system editor for multi-line input |
| `/help` | Help |

### Fallback Terminal Hook

When installed, any command that doesn't exist in your shell gets automatically forwarded to `air`. The AI will interpret what you meant and help you out.

```bash
$ gred "hello" file.txt
# → command not found → auto-redirects to air
# → AI: "Did you mean grep?"
```

## Design

```
~/.ai-zen/air/
├── config.json       # { "apiKey": "sk-xxx" }
├── context.json      # [ { role, content }, ... ]    Current conversation
├── snapshots/        # Auto snapshots before migration or /save
└── temp/             # Long-term memory written by AI (*.md)
```

### Core Philosophy

- **Model**: DeepSeek-V4-Flash (hardcoded, only one)
- **Tool**: Just one `shell` tool — the AI executes commands, reads and writes files through it
- **Memory**: The AI decides what to remember, writes to `temp/*.md` via shell, reads on next startup. No extra persistence mechanism
- **Context**: Auto-migrates when JSON serialization exceeds 500K chars, takes a snapshot before migration
- **Rules**: Consult the user before making changes. Dangerous operations require explicit written confirmation. The user takes responsibility for their own instructions

## Project Structure

```
src/
├── cli.ts              # CLI entry, commander
├── config.ts           # Config, context, snapshot read/write
├── delta-renderer.ts   # Stream renderer
├── hook.ts             # Fallback terminal hook (install/uninstall)
├── migration.ts        # Context counting & migration
├── tools.ts            # Tool definitions — shell
├── agent-factory.ts    # Agent factory — build model & agent
├── chat/
│   ├── shared.ts       # ChatCtx type & SYSTEM_PROMPT
│   ├── runtime.ts      # runChat() & chatLoop() — core runtime
│   ├── message.ts      # handleMessage() — send & migrate
│   ├── print.ts        # sendAndPrint() — stream output
│   └── commands/
│       ├── index.ts    # dispatchCommand() — command router
│       ├── back.ts     # /back — recall & resend
│       ├── editor.ts   # /editor — multi-line input
│       ├── exit.ts     # /exit — quit
│       ├── help.ts     # /help
│       ├── load.ts     # /load — load snapshot
│       ├── new.ts      # /new — new session
│       └── save.ts     # /save — save snapshot
└── __tests__/
    ├── chat.test.ts    # Chat session tests
    ├── config.test.ts  # Config/context/snapshot tests
    ├── main.test.ts    # contextSize/shouldMigrate tests
    ├── e2e.test.ts     # End-to-end tests
    └── tools.test.ts   # Shell tool structure tests
```

~49 KB, 881 lines.

## Tests

```bash
npm test
```
