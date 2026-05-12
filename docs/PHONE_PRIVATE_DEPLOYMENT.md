# 私有化与手机接收方案

目标：项目私有运行，内容每天自动到手机，而不是依赖手动打开 AIHOT。

## 推荐路径

最稳的路径是：

1. 本项目运行在你的 Mac mini / VPS / NAS / 长期开机电脑。
2. 本项目定时拉取 AIHOT 公开 API，生成中文摘要。
3. 摘要通过飞书自定义机器人发到你的飞书私聊或个人群。
4. 手机飞书开启通知，即可每天接收。

这种方式不需要把网页暴露到公网，隐私和稳定性都更好。

## 运行方式

本地服务：

```bash
cd /path/to/local-ai-source
cp .env.example .env
npm run dev
```

飞书推送预览：

```bash
npm run push:feishu -- --dry-run --hours=24 --take=12
```

正式推送：

```bash
npm run push:feishu -- --hours=24 --take=12
```

使用 AIHOT 官方日报：

```bash
npm run push:feishu -- --daily
```

## 飞书配置

在飞书里创建一个只给自己看的群，添加“自定义机器人”，复制 webhook 到 `.env`：

```bash
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/...
FEISHU_BOT_SECRET=如果启用了签名就填
```

如果机器人启用了“关键词安全策略”，记得把关键词设为 `AI` 或 `日报`，因为推送正文里会包含这些词。

## OpenClaw 定时

让 OpenClaw 每天北京时间 08:30 跑：

```bash
openclaw cron add \
  --name "AI 信息源日报" \
  --cron "30 8 * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --message "进入你的 local-ai-source 项目目录，执行 npm run push:feishu -- --hours=24 --take=12。成功后只回复已发送，失败时回复错误原因。"
```

查看任务：

```bash
openclaw cron list
openclaw cron runs --id <job-id> --limit 20
```

## 不依赖 OpenClaw 的本地定时

如果只想让 MacBook 自己每天发飞书，填好 `.env` 后执行：

```bash
cd ~/local-ai-source
npm run install:mac-daily
```

它会每天北京时间 08:30 执行：

```bash
npm run push:feishu -- --hours=24 --take=12
```

## 手机访问网页

如果只是为了每天读内容，不建议暴露网页，飞书推送就够了。

如果你确实想在手机浏览本地网站，有三种方式：

- 同一局域网：手机访问电脑局域网 IP 的 `8787` 端口。
- Tailscale：电脑和手机加入同一个 tailnet，用 Tailscale IP 访问。
- VPS：把项目部署到私有 VPS，再用反向代理和访问密码保护。

不要裸露公网端口给任何人访问。
