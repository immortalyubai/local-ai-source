# OpenClaw 每日 AI 信息源任务

## 方式 A：OpenClaw 调本地脚本，由脚本发飞书机器人

每天北京时间 08:30 执行下面命令，把最近 24 小时 AI 精选推送到飞书：

```bash
cd /path/to/local-ai-source
npm run push:feishu -- --hours=24 --take=12
```

如果想改成 AIHOT 官方日报，而不是滚动 24 小时精选，执行：

```bash
cd /path/to/local-ai-source
npm run push:feishu -- --daily
```

执行前确保 `.env` 已配置：

```bash
FEISHU_WEBHOOK_URL=你的飞书机器人 webhook
FEISHU_BOT_SECRET=你的飞书机器人签名密钥（如果启用了签名）
```

可让 OpenClaw 建一个定时任务：

```bash
openclaw cron add \
  --name "AI 信息源日报" \
  --cron "30 8 * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --message "进入你的 local-ai-source 项目目录，执行 npm run push:feishu -- --hours=24 --take=12。成功后只回复已发送，失败时回复错误原因。"
```

## 方式 B：OpenClaw 自己投递到飞书频道

如果你的 OpenClaw 已经接好了飞书 Channel，可以让脚本只生成摘要，由 OpenClaw 投递最终文本：

```bash
openclaw cron add \
  --name "AI 信息源日报" \
  --cron "30 8 * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --message "进入你的 local-ai-source 项目目录，执行 npm run digest -- --hours=24 --take=12，把命令输出原样作为日报正文返回。" \
  --announce \
  --channel feishu \
  --to "替换成你的飞书会话或群聊目标"
```

管理命令：

```bash
openclaw cron list
openclaw cron run <job-id>
openclaw cron runs --id <job-id> --limit 20
```
