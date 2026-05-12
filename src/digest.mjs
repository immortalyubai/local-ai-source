import { CATEGORY_ORDER, CATEGORIES, fetchDaily, fetchItems } from "./aihotClient.mjs";

const BJ_TIME = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

function titleForCategory(category) {
  return CATEGORIES[category] || "未分类";
}

function itemCategory(item) {
  return item.category && CATEGORIES[item.category] ? item.category : "uncategorized";
}

function formatTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes || 1} 分钟前`;
  if (diffMinutes < 24 * 60) return `${Math.round(diffMinutes / 60)} 小时前`;
  return BJ_TIME.format(date).replace(/\//g, "/");
}

function trimSummary(text, max = 150) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function lineItem(item, index) {
  const source = item.source ? ` - ${item.source}` : "";
  const time = formatTime(item.publishedAt);
  const summary = trimSummary(item.summary);
  const bits = [`${index}. ${item.title}${source}`];
  if (time) bits.push(`   ${time}`);
  if (summary) bits.push(`   ${summary}`);
  bits.push(`   ${item.url}`);
  return bits.join("\n");
}

export function formatItemsDigest(data, meta = {}) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const label = meta.category ? titleForCategory(meta.category) : "AI 精选动态";
  const windowText = meta.hours ? `最近 ${meta.hours} 小时` : "最近动态";
  const keywordText = meta.q ? ` · 关键词：${meta.q}` : "";
  const modeText = meta.mode === "all" ? "全部池" : "精选池";

  const lines = [`AI 信息源日报 · ${windowText}${keywordText}`, `${modeText}，共 ${items.length} 条`, ""];

  if (!items.length) {
    lines.push("今天暂时没有命中条件的新内容。");
    return lines.join("\n");
  }

  if (meta.category) {
    lines.push(`## ${label}`);
    items.forEach((item, index) => lines.push(lineItem(item, index + 1), ""));
    return lines.join("\n").trim();
  }

  let counter = 1;
  const groups = new Map();
  for (const item of items) {
    const key = itemCategory(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const ordered = [...CATEGORY_ORDER, "uncategorized"].filter((category) => groups.has(category));
  for (const category of ordered) {
    lines.push(`## ${titleForCategory(category)}`);
    for (const item of groups.get(category)) {
      lines.push(lineItem(item, counter), "");
      counter += 1;
    }
  }

  return lines.join("\n").trim();
}

export function formatDailyDigest(data) {
  const lines = [`AI HOT 日报 · ${data.date || "最新"}`];

  if (data.lead?.title) lines.push(data.lead.title);
  if (data.lead?.leadParagraph) lines.push(trimSummary(data.lead.leadParagraph, 220));
  lines.push("");

  let counter = 1;
  for (const section of data.sections || []) {
    lines.push(`## ${section.label}`);
    const sectionItems = Array.isArray(section.items) ? section.items : [];
    if (!sectionItems.length) {
      lines.push("暂无。", "");
      continue;
    }

    for (const item of sectionItems) {
      const title = item.title || "未命名条目";
      const source = item.sourceName ? ` - ${item.sourceName}` : "";
      const summary = trimSummary(item.summary);
      const url = item.sourceUrl || item.url;
      lines.push(`${counter}. ${title}${source}`);
      if (summary) lines.push(`   ${summary}`);
      if (url) lines.push(`   ${url}`);
      lines.push("");
      counter += 1;
    }
  }

  if (Array.isArray(data.flashes) && data.flashes.length) {
    lines.push("## 快讯");
    for (const flash of data.flashes) {
      const source = flash.sourceName ? ` - ${flash.sourceName}` : "";
      const url = flash.sourceUrl || flash.url;
      lines.push(`- ${flash.title}${source}`);
      if (url) lines.push(`  ${url}`);
    }
  }

  return lines.join("\n").trim();
}

export async function buildDigest(options = {}) {
  if (options.type === "daily") {
    const response = await fetchDaily(options.date);
    return {
      markdown: formatDailyDigest(response.data),
      data: response.data,
      sourceUrl: response.url
    };
  }

  const params = {
    mode: options.mode || process.env.AI_SOURCE_DEFAULT_MODE || "selected",
    category: options.category,
    hours: options.hours || process.env.AI_SOURCE_DEFAULT_HOURS || 24,
    q: options.q,
    take: options.take || process.env.AI_SOURCE_DEFAULT_TAKE || 12
  };
  const response = await fetchItems(params);

  return {
    markdown: formatItemsDigest(response.data, params),
    data: response.data,
    sourceUrl: response.url
  };
}
