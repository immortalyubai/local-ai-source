# GitHub 开源发布清单

这份清单用于把 Local AI Source 发布为公开 GitHub 仓库。

## 1. 检查密钥

真实配置只应该存在于 `.env`，不要提交。

```bash
git check-ignore .env
rg -n "open-apis/bot|FEISHU_WEBHOOK_URL=.+|FEISHU_BOT_SECRET=.+" \
  -g '!README.md' \
  -g '!docs/**' \
  -g '!.env.example'
```

如果 `rg` 命中真实 webhook 或 secret，先删除再提交。

## 2. 初始化提交

```bash
git add .
git status --short
git commit -m "Initial open-source release"
```

## 3. 创建 GitHub 仓库

如果安装了 GitHub CLI：

```bash
gh auth login
gh repo create local-ai-source --public --source . --remote origin --push
```

如果没有 GitHub CLI：

1. 打开 https://github.com/new
2. 创建仓库，例如 `local-ai-source`
3. 不要勾选初始化 README / .gitignore / license
4. 在本地执行 GitHub 页面给出的 remote 命令，例如：

```bash
git remote add origin git@github.com:<your-name>/local-ai-source.git
git branch -M main
git push -u origin main
```

## 4. 仓库描述建议

Description:

```text
A local AI news dashboard and Feishu daily digest powered by public AIHOT APIs.
```

Topics:

```text
ai-news, rss, feishu, dashboard, automation, nodejs
```

## 5. 发布后建议

- 在仓库 About 区加上 `http://localhost:8787` 不合适，因为它只在本地可用。
- 可以上传一张本地截图到 README，作为展示图。
- 如果后续部署到公网，再补 demo URL。
