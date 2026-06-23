# air

用 1% 的功能完成 99% 的事情。

一个极简的 AI 命令行助手。只有一个 shell 工具，AI 自己用文件系统记东西，上下文满了自动迁移。

## 安装

```bash
git clone git@github.com:ai-zen/air.git
cd air
npm install
npm run build
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

## 设计

```
~/.ai-zen/air/
├── config.json       # { "apiKey": "sk-xxx" }
├── context.json      # [ { role, content }, ... ]    当前对话
├── snapshots/        # /save 或迁移前自动快照
└── temp/             # AI 自己写入的长期记忆 (*.md)
```

### 核心理念

- **模型**: DeepSeek-V4-Flash（写死，只有一个）
- **工具**: 只有一个 `shell`，AI 用它执行命令、读写文件
- **记忆**: AI 自己决定记什么，用 shell 写入 `temp/*.md`，下次启动时读取。air 不做额外的持久化机制
- **上下文**: JSON 序列化后超过 50 万字符自动迁移，迁移前拍快照
- **行为准则**: 先商量再动手，危险操作必须获得用户书面确认。追责原则——每一步基于用户指令，用户承担责任

## 项目结构

```
src/
├── cli.ts              # CLI 入口，commander (48行)
├── config.ts           # 配置与文件读写 (109行)
├── delta-renderer.ts   # 流式渲染器 (126行，复用自 agents 项目)
├── tools.ts            # 工具定义——shell (23行)
├── agent-factory.ts    # Agent 工厂——构建模型与 Agent (23行)
├── migration.ts        # 上下文计数与任务迁移 (72行)
├── agent-runtime.ts    # 运行时——对话循环与命令处理 (256行)
└── __tests__/
    ├── config.test.ts  # 配置/上下文/快照测试 (110行)
    ├── main.test.ts    # contextSize/shouldMigrate 测试 (43行)
    └── tools.test.ts   # shell 工具结构测试 (15行)
```

共 40 KB，826 行。

## 测试

```bash
npm test
```
