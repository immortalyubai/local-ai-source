# MacBook 本地部署

建议第一版部署在 MacBook 上，因为当前项目已经在 macOS 环境跑通，Node 版本满足要求，飞书和 OpenClaw 配置也更直接。

## 一次性部署

```bash
cd /path/to/local-ai-source
npm run deploy:mac
```

部署脚本会把项目同步到：

```text
~/local-ai-source
```

然后创建 macOS LaunchAgent：

```text
~/Library/LaunchAgents/com.local-ai-source.server.plist
```

它会在登录后自动启动，并保持 `http://localhost:8787` 可访问。

之所以不直接从 `Documents` 目录后台运行，是因为 macOS 对 `Documents/Desktop/Downloads` 有隐私权限保护，LaunchAgent 容易卡在目录访问上。`~/local-ai-source` 更适合长期后台服务。

## 检查状态

```bash
curl http://localhost:8787/api/health
lsof -nP -iTCP:8787 -sTCP:LISTEN
tail -f ~/local-ai-source/logs/server.log
```

## 手动启动

不用 LaunchAgent 时也可以手动跑：

```bash
cd ~/local-ai-source
npm run dev
```

## 卸载自动启动

```bash
cd ~/local-ai-source
npm run uninstall:mac
```

## 接飞书

打开部署目录里的 `.env`，填入飞书自定义机器人：

```bash
open -e ~/local-ai-source/.env
```

内容类似：

```bash
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/...
FEISHU_BOT_SECRET=如果启用了签名就填
```

测试：

```bash
cd ~/local-ai-source
npm run push:feishu -- --dry-run --hours=24 --take=12
npm run push:feishu -- --hours=24 --take=12
```

## 每天自动推送到手机

填好飞书配置并确认手动发送成功后，安装每日 08:30 推送任务：

```bash
cd ~/local-ai-source
npm run install:mac-daily
```

查看任务：

```bash
launchctl print gui/$(id -u)/com.local-ai-source.daily-push
tail -f ~/local-ai-source/logs/daily-push.log
tail -f ~/local-ai-source/logs/daily-push.err.log
```

卸载每日推送：

```bash
cd ~/local-ai-source
npm run uninstall:mac-daily
```

如果改了 `.env` 后要让网页服务重新读取配置：

```bash
cd ~/local-ai-source
npm run uninstall:mac
npm run install:mac
```

## Windows 什么时候更适合

Windows 适合长期不关机的台式机或已有 Windows Server/VPS 的情况。第一版不建议先上 Windows，因为要额外处理 Node 安装、开机任务、PowerShell 路径和防火墙端口。
