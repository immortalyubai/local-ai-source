# AIHOT 信息源与筛选机制

这份说明只基于 AIHOT 公开页面、公开 Skill 文档和 `openapi.yaml`。它能帮助我们复刻“可公开确认的机制”，但不能等同于拿到了 AIHOT 后台完整源码、完整信源库或模型 prompt。

## 当前项目的定位

当前项目是“私有中转与分发层”：

- 使用 AIHOT 公开 API / RSS 拉取内容。
- 本地做二次筛选、摘要排版、RSS 再分发和飞书推送。
- 不保存 AIHOT 的内部评分字段，因为公开 REST API 已剥离内部评分。

如果要做完全私有化的信息源系统，下一阶段需要自己维护：

- 信源列表。
- 抓取器。
- 去重与聚类。
- LLM 分类、摘要、评分。
- 日报生成和推送。

## AIHOT 公开端点

- `GET /api/public/items`：动态条目，支持精选/全量、分类、时间窗、关键词。
- `GET /api/public/daily`：最新日报。
- `GET /api/public/daily/{YYYY-MM-DD}`：指定日期日报。
- `GET /api/public/dailies`：日报归档。
- RSS：`/feed.xml`、`/feed/all.xml`、`/feed/daily.xml`。

API 匿名可用，但 `/api/public/*` 需要浏览器 `User-Agent`。项目已在 `src/aihotClient.mjs` 里统一处理。

## 可见信源类型

从返回数据和页面渲染可见，AIHOT 的内容源至少包含：

- X/Twitter 账号。
- RSS，例如 Hugging Face Blog、Simon Willison 博客、Hacker News 翻译等。
- 网页列表，例如公司/产品博客。
- JSON 列表，例如 GitHub 新仓库或机构发布源。
- 公众号爆文单独在前端 `/mp` 页面，公开 items API 明确不返回 `mp_hot` 信源。

公开 API 不提供完整信源表，所以我们只能从最近条目反推出活跃来源。可运行：

```bash
npm run sources -- --hours=168 --take=100
```

输出会对最近 7 天的全量池和精选池按来源分组。

## 分类体系

items API 的 `category` 有 5 类：

- `ai-models`：模型发布/更新
- `ai-products`：产品发布/更新
- `industry`：行业动态
- `paper`：论文研究
- `tip`：技巧与观点

日报里对应的中文 section 也是这 5 类。

## 精选池 selected

`mode=selected` 是默认模式，也就是 AIHOT 希望普通用户优先看到的“主菜单”。

公开文档确认的过滤规则：

- 已合并的重复条目不返回。
- 公众号 `mp_hot` 信源不返回。
- 禁用或 `present=false` 的信源不返回。
- 同事件聚类里的 secondary / related 不返回，只保留 primary。
- `aiSelected != true` 的条目不返回。

这说明精选不是简单按时间排序，而是经过相关性判断、事件聚类、去重和“是否值得精选”的模型/规则筛选。

## 全量池 all

`mode=all` 不是原始抓取池，而是“经过基本清洗后的全量 AI 动态”。

公开文档确认的过滤规则：

- 已合并的重复条目不返回。
- 公众号 `mp_hot` 信源不返回。
- 禁用或 `present=false` 的信源不返回。
- 尚未跑评分的内容，即 `aiSelected IS NULL`，不返回。
- AI 相关性低于阈值的内容，即 `aiRelevance < 60`，不返回。

所以 all 更杂，但仍然不是未处理原始数据。

## 时间、排序与搜索

- `items` 默认只返回最近 7 天。
- `since` 早于 7 天会被截断到 7 天前。
- 需要更早内容要走日报存档。
- 排序按 `publishedAt` 真实发布时间倒序。
- `q` 在标题、中文标题、中文摘要上做服务端关键词搜索。
- `take` 最大 100，更多需要 cursor 翻页。

## 我们可以复刻的私有筛选策略

如果后续要从“AIHOT 中转”升级为“自己的 AI 信息源”，建议按这个流程做：

1. Source：维护 RSS、X 账号、GitHub、公司博客、论文源。
2. Fetch：定时拉取，保留原文 URL、发布时间、来源类型。
3. Normalize：统一标题、正文摘要、作者、发布时间。
4. Dedupe：按 URL、标题相似度、同事件关键词合并。
5. Classify：分到模型、产品、行业、论文、技巧 5 类。
6. Score：计算相关性、重要性、时效性、可行动性。
7. Select：只把高分和事件 primary 推入精选池。
8. Digest：生成日报，再发飞书。

当前项目已经完成第 8 步的本地分发，以及对 AIHOT 已处理数据的二次筛选。
