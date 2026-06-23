# air

用 1% 的功能完成 99% 的事情。

一个极简的 AI 命令行助手。只有一个 shell 工具，记忆直接落文件系统，上下文满了自动迁移。

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
air config set-key sk-xxxxxxxxxxxxxxxx

# 交互模式（自动恢复上次对话）
air

# 直接发一条消息
air 用 shell 帮我看看当前目录有哪些文件

# 查看配置
air config show
```

### 交互命令

| 命令 | 说明 |
|------|------|
| `/exit` `/quit` | 退出 |
| `/save` | 保存快照到 snapshots 目录 |
| `/new` | 清空上下文重新开始 |
| `/help` | 帮助 |

## 设计

```
~/.ai-zen/air/
├── config.json       # { "apiKey": "sk-xxx" }
├── context.json      # [ { role, content }, ... ]    当前对话
└── snapshots/        # /save 或迁移前自动快照
```

- **模型**: DeepSeek-V4-Flash（写死）
- **工具**: 只有一个 `shell`，执行命令返回输出
- **上下文**: JSON 序列化后超过 66 万字符自动迁移
- **持久化**: 每次回复后自动写入 `~/.ai-zen/air/context.json`

## 项目结构

```
src/
├── config.ts           # 配置与文件读写 (77行)
├── delta-renderer.ts   # 流式渲染器 (126行)
├── main.ts             # 入口 + 对话循环 + 迁移 (201行)
└── __tests__/
    ├── config.test.ts  # 配置/上下文/快照测试 (90行)
    └── main.test.ts    # contextSize/shouldMigrate 测试 (43行)
```

共 18.5 KB，537 行。

## 测试

```bash
npm test
```
