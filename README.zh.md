# air

用 1% 的功能完成 99% 的事情。

一个极简的 AI 命令行助手。只有一个 shell 工具，AI 自己用文件系统记东西，上下文满了自动迁移。

## 安装

```bash
# 全局安装（推荐）
npm install -g @ai-zen/air

# 或从源码构建
git clone git@github.com:ai-zen/air.git
cd air
npm install
npm run build
npm install -g .
```

## 使用

```bash
# 设置 API Key（DeepSeek）
air key sk-xxxxxxxxxxxxxxxx

# 交互模式（自动恢复上次对话）
air

# 直接发一条消息
air 用 shell 帮我看看当前目录有哪些文件

# 查看配置
air config

# 安装兜底终端钩子（命令不存在时自动转发到 air）
air hook install

# 卸载兜底终端钩子
air hook uninstall
```

### 交互命令

| 命令 | 说明 |
|------|------|
| `/exit` `/quit` | 退出 |
| `/save` | 保存快照 |
| `/load` | 加载快照 |
| `/new` | 清空上下文重新开始 |
| `/back` | 撤回消息（可选修改后重发） |
| `/editor` | 打开系统编辑器输入多行文本 |
| `/help` | 帮助 |

### 兜底终端钩子

安装后，任何 shell 中不存在的命令都会自动转发到 `air`，AI 会解读你的意图并帮助你。

```bash
$ gred "hello" file.txt
# → command not found → 自动转发到 air
# → AI: "你是不是想用 grep？"
```

## 设计

```
~/.ai-zen/air/
├── config.json       # { "apiKey": "sk-xxx" }
├── context.json      # [ { role, content }, ... ]    当前对话
├── snapshots/        # /save 或迁移前自动快照
└── memory/           # AI 自己写入的长期记忆 (*.md)
```

### 核心理念

- **模型**: DeepSeek-V4-Flash（写死，只有一个）
- **工具**: 只有一个 `shell`，AI 用它执行命令、读写文件
- **记忆**: AI 自己决定记什么，用 shell 写入 `memory/*.md`，下次启动时读取。air 不做额外的持久化机制
- **上下文**: JSON 序列化后超过 50 万字符自动迁移，迁移前拍快照
- **行为准则**: 先商量再动手，危险操作必须获得用户书面确认。追责原则——每一步基于用户指令，用户承担责任

## 项目结构

```
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
├── agent-commands/       # 交互命令处理
│   ├── index.ts          # dispatchCommand() — 命令分发入口
│   ├── back.ts           # /back — 撤回消息
│   ├── editor.ts         # /editor — 多行编辑器输入
│   ├── exit.ts           # /exit — 退出
│   ├── help.ts           # /help
│   ├── load.ts           # /load — 加载快照
│   ├── new.ts            # /new — 新会话
│   └── save.ts           # /save — 保存快照
└── __tests__/
    ├── chat.test.ts      # 聊天测试
    ├── config.test.ts    # 配置/上下文/快照测试
    ├── main.test.ts      # contextSize/shouldMigrate 测试
    ├── e2e.test.ts       # 端到端测试
    └── tools.test.ts     # shell 工具结构测试
```

共 116 KB，1381 行。

## 测试

```bash
npm test
```
