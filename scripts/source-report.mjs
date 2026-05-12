#!/usr/bin/env node
import { CATEGORY_ORDER, CATEGORIES, fetchItems } from "../src/aihotClient.mjs";
import { loadEnv } from "../src/env.mjs";

loadEnv();

function parseArgs(argv) {
  const options = { hours: 168, take: 100 };
  for (const arg of argv) {
    if (arg.startsWith("--hours=")) options.hours = arg.slice("--hours=".length);
    else if (arg.startsWith("--take=")) options.take = arg.slice("--take=".length);
    else if (arg.startsWith("--q=")) options.q = arg.slice("--q=".length);
  }
  return options;
}

function groupBySource(items) {
  const map = new Map();
  for (const item of items) {
    const source = item.source || "未知来源";
    const hit = map.get(source) || {
      source,
      count: 0,
      categories: new Map(),
      latestAt: null,
      examples: []
    };
    hit.count += 1;
    const category = item.category || "uncategorized";
    hit.categories.set(category, (hit.categories.get(category) || 0) + 1);
    if (!hit.latestAt || (item.publishedAt && item.publishedAt > hit.latestAt)) hit.latestAt = item.publishedAt;
    if (hit.examples.length < 2) hit.examples.push(item.title);
    map.set(source, hit);
  }

  return [...map.values()]
    .sort((a, b) => b.count - a.count || String(b.latestAt || "").localeCompare(String(a.latestAt || "")))
    .map((entry) => ({
      ...entry,
      categoriesText: [...entry.categories.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => `${CATEGORIES[key] || key}:${count}`)
        .join(" / ")
    }));
}

function printSourceTable(title, items) {
  const grouped = groupBySource(items);
  console.log(`\n## ${title}`);
  console.log(`条目数：${items.length}；来源数：${grouped.length}`);
  for (const entry of grouped.slice(0, 20)) {
    console.log(`- ${entry.source}：${entry.count} 条；${entry.categoriesText}`);
    for (const example of entry.examples) console.log(`  - ${example}`);
  }
}

const options = parseArgs(process.argv.slice(2));
const [selected, all] = await Promise.all([
  fetchItems({ mode: "selected", hours: options.hours, take: options.take, q: options.q }),
  fetchItems({ mode: "all", hours: options.hours, take: options.take, q: options.q })
]);

const selectedItems = selected.data.items || [];
const allItems = all.data.items || [];
const selectedIds = new Set(selectedItems.map((item) => item.id));
const promoted = allItems.filter((item) => selectedIds.has(item.id)).length;

console.log(`# AIHOT 来源与筛选快照`);
console.log(`时间窗：最近 ${options.hours} 小时`);
console.log(`采样上限：每个池子 ${options.take} 条`);
if (options.q) console.log(`关键词：${options.q}`);
console.log("");
console.log(`全量池采样：${allItems.length} 条`);
console.log(`精选池采样：${selectedItems.length} 条`);
console.log(`全量池中同时出现在精选池的条目：${promoted} 条`);

console.log("\n## 分类分布");
for (const category of [...CATEGORY_ORDER, "uncategorized"]) {
  const allCount = allItems.filter((item) => (item.category || "uncategorized") === category).length;
  const selectedCount = selectedItems.filter((item) => (item.category || "uncategorized") === category).length;
  if (allCount || selectedCount) {
    console.log(`- ${CATEGORIES[category] || category}：全量 ${allCount} / 精选 ${selectedCount}`);
  }
}

printSourceTable("精选池 Top 来源", selectedItems);
printSourceTable("全量池 Top 来源", allItems);

console.log("\n## 已公开的筛选机制");
console.log("- selected 是默认精选池，只保留 AIHOT 判定值得展示的主条目。");
console.log("- selected 会过滤重复条目、禁用来源、公众号 mp_hot、同事件聚类里的 secondary/related，并要求 aiSelected=true。");
console.log("- all 是全量池，但也不是原始抓取池；它仍会过滤重复、禁用来源、公众号 mp_hot、未评分内容，以及 aiRelevance < 60 的弱相关内容。");
console.log("- items 接口默认只查最近 7 天，超过 7 天需要查 daily 存档。");
