# Local AI Source

Local AI Source 是一个可本地部署的 AI 信息源中转站。它默认接入 AIHOT 公开 API / RSS，把 AI 动态整理成本地网页、RSS、Markdown 日报，并可推送到飞书群或个人群。

这个项目适合做两件事：

- 私有接收：在自己的电脑、Mac mini、NAS 或 VPS 上运行，每天把 AI 信息推到手机。
- 展示与二次开发：作为一个轻量级 AI 信息源 dashboard，展示公开 API 接入、筛选、摘要和自动推送流程。

> 本项目不是 AIHOT 官方项目，也不包含 AIHOT 后台源码、内部信源库或内部 prompt。它只使用公开可访问的 API / RSS，并在本地做二次展示和分发。

## 功能

- 本地网页 dashboard：精选、全部、日报、分类、时间窗、关键词筛选。
- 本地 API 中转：统一处理 AIHOT API 所需的浏览器 User-Agent。
- RSS 再分发：`/feed.xml` 可被 RSS reader 或自动化工具订阅。
- 飞书推送：支持飞书自定义机器人 webhook 和签名密钥。
- 定时任务：macOS LaunchAgent 每天 08:30 自动推送。
- 来源分析：查看最近 7 天全量池和精选池的来源分布。

## 快速开始

```bash
git clone <your-repo-url>
cd local-ai-source
cp .env.example .env
npm run dev
```

打开：

```text
http://localhost:8787
```

要求：

- Node.js 20+
- macOS / Linux / Windows 均可手动运行
- 自动后台部署脚本目前面向 macOS

## 配置

在 `.env` 中配置：

```bash
AIHOT_BASE_URL=https://aihot.virxact.com
PORT=8787

FEISHU_WEBHOOK_URL=
FEISHU_BOT_SECRET=

AI_SOURCE_DEFAULT_MODE=selected
AI_SOURCE_DEFAULT_HOURS=24
AI_SOURCE_DEFAULT_TAKE=12
```

`.env` 已加入 `.gitignore`，不要提交真实 webhook 或签名密钥。

## 常用命令

```bash
# 启动本地网站
npm run dev

# 预览日报，不发送
npm run push:feishu -- --dry-run --hours=24 --take=12

# 发送到飞书
npm run push:feishu -- --hours=24 --take=12

# 使用 AIHOT 官方日报端点
npm run push:feishu -- --daily

# 查看来源与精选机制快照
npm run sources -- --hours=168 --take=100
```

## 本地接口

- `GET /api/health`
- `GET /api/items?mode=selected&category=ai-models&hours=24&take=60`
- `GET /api/daily`
- `GET /api/digest?hours=24&take=12`
- `POST /api/feishu/send`
- `GET /feed.xml?mode=selected&hours=24&take=50`

## MacBook 部署

推荐第一版部署在 MacBook 或 Mac mini。自动部署：

```bash
npm run deploy:mac
```

脚本会把项目同步到 `~/local-ai-source`，并创建后台服务。完整说明见 [docs/MACBOOK_DEPLOYMENT.md](docs/MACBOOK_DEPLOYMENT.md)。

## 手机接收

最稳的方式是飞书自定义机器人：

1. 在飞书创建一个自己使用的群。
2. 添加“自定义机器人”。
3. 复制 webhook 和签名密钥到 `.env`。
4. 运行测试发送。
5. 安装每日自动推送。

详见 [docs/PHONE_PRIVATE_DEPLOYMENT.md](docs/PHONE_PRIVATE_DEPLOYMENT.md)。

## 筛选机制说明

AIHOT 公开 API 提供 `selected` 和 `all` 两种模式：

- `selected` 是精选池，会过滤重复、禁用来源、公众号 `mp_hot`、同事件 secondary/related，只保留 `aiSelected=true` 的主条目。
- `all` 也不是原始抓取池，仍会过滤重复、禁用来源、公众号、未评分内容，以及 `aiRelevance < 60` 的弱相关内容。
- 分类固定为模型、产品、行业、论文、技巧观点。
- `items` 默认只查询最近 7 天，更早内容需要走日报归档。

详见 [docs/AIHOT_FILTERING_MECHANISM.md](docs/AIHOT_FILTERING_MECHANISM.md)。

## 开源发布

发布到 GitHub 前请确认：

```bash
git status --short
git check-ignore .env
rg -n "open-apis/bot|FEISHU_WEBHOOK_URL=.+|FEISHU_BOT_SECRET=.+" -g '!README.md' -g '!docs/**' -g '!.env.example'
```

更多发布步骤见 [docs/GITHUB_PUBLISHING.md](docs/GITHUB_PUBLISHING.md)。

## 参考

- AIHOT Agent 接入页：https://aihot.virxact.com/agent
- AIHOT OpenAPI YAML：https://aihot.virxact.com/openapi.yaml
- AIHOT Skill 文档：https://aihot.virxact.com/aihot-skill/SKILL.md

## License

MIT
