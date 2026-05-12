const CATEGORY_LABELS = {
  "ai-models": "模型发布/更新",
  "ai-products": "产品发布/更新",
  industry: "行业动态",
  paper: "论文研究",
  tip: "技巧与观点",
  uncategorized: "未分类"
};

const CATEGORY_ORDER = ["ai-models", "ai-products", "industry", "paper", "tip", "uncategorized"];

const state = {
  view: "selected",
  category: "",
  hours: "24",
  q: ""
};

const content = document.querySelector("#content");
const statusEl = document.querySelector("#status");
const countEl = document.querySelector("#metric-count");
const rssLink = document.querySelector("#rss-link");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function humanTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes || 1} 分钟前`;
  if (diffMinutes < 24 * 60) return `${Math.round(diffMinutes / 60)} 小时前`;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function queryString(extra = {}) {
  const params = new URLSearchParams();
  params.set("take", "60");
  params.set("hours", state.hours);
  params.set("mode", state.view === "all" ? "all" : "selected");
  if (state.category) params.set("category", state.category);
  if (state.q.trim().length >= 2) params.set("q", state.q.trim());
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

function itemTemplate(item, index) {
  const category = item.category || "uncategorized";
  const meta = [item.source || "未知来源", humanTime(item.publishedAt)]
    .filter(Boolean)
    .map((value) => `<span>${escapeHtml(value)}</span>`)
    .join("");
  return `<article class="item">
    <div class="rank">${index}</div>
    <div>
      <h2><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></h2>
      <div class="meta">${meta}</div>
      <p class="summary">${escapeHtml(item.summary || "")}</p>
    </div>
    <div class="category-pill">${escapeHtml(CATEGORY_LABELS[category] || "未分类")}</div>
  </article>`;
}

function renderItems(data) {
  const items = Array.isArray(data.items) ? data.items : [];
  countEl.textContent = String(items.length);

  if (!items.length) {
    content.innerHTML = `<div class="empty">没有找到匹配内容。</div>`;
    return;
  }

  if (state.category) {
    content.innerHTML = items.map((item, index) => itemTemplate(item, index + 1)).join("");
    return;
  }

  let counter = 1;
  const groups = new Map();
  for (const item of items) {
    const key = item.category || "uncategorized";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const html = [];
  for (const category of CATEGORY_ORDER) {
    const group = groups.get(category);
    if (!group?.length) continue;
    html.push(`<h3 class="section-title">${escapeHtml(CATEGORY_LABELS[category])}</h3>`);
    for (const item of group) {
      html.push(itemTemplate(item, counter));
      counter += 1;
    }
  }
  content.innerHTML = html.join("");
}

function renderDaily(data) {
  countEl.textContent = String((data.sections || []).reduce((sum, section) => sum + (section.items?.length || 0), 0));
  const html = [];
  if (data.lead?.title) {
    html.push(`<div class="item"><div class="rank">日</div><div><h2>${escapeHtml(data.lead.title)}</h2><p class="summary">${escapeHtml(data.lead.leadParagraph || "")}</p></div><div class="category-pill">${escapeHtml(data.date || "最新")}</div></div>`);
  }
  let counter = 1;
  for (const section of data.sections || []) {
    html.push(`<h3 class="section-title">${escapeHtml(section.label)}</h3>`);
    for (const item of section.items || []) {
      html.push(
        itemTemplate(
          {
            title: item.title,
            url: item.sourceUrl,
            source: item.sourceName,
            summary: item.summary,
            publishedAt: item.publishedAt,
            category: Object.keys(CATEGORY_LABELS).find((key) => CATEGORY_LABELS[key] === section.label)
          },
          counter
        )
      );
      counter += 1;
    }
  }
  content.innerHTML = html.join("") || `<div class="empty">日报暂时为空。</div>`;
}

async function refresh() {
  statusEl.textContent = "加载中";
  content.innerHTML = `<div class="empty">加载中...</div>`;
  try {
    if (state.view === "daily") {
      const response = await fetch("/api/daily");
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      renderDaily(data);
    } else {
      const qs = queryString();
      const response = await fetch(`/api/items?${qs}`);
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      renderItems(data);
      rssLink.href = `/feed.xml?${qs}`;
    }
    statusEl.textContent = `已更新 ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  } catch (error) {
    statusEl.textContent = "失败";
    content.innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;
  }
}

async function pushFeishu() {
  statusEl.textContent = "推送中";
  try {
    const payload =
      state.view === "daily"
        ? { type: "daily" }
        : {
            mode: state.view === "all" ? "all" : "selected",
            category: state.category,
            hours: state.hours,
            q: state.q,
            take: 12
          };
    const response = await fetch("/api/feishu/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "推送失败");
    statusEl.textContent = "已推送飞书";
  } catch (error) {
    statusEl.textContent = "推送失败";
    content.insertAdjacentHTML("afterbegin", `<div class="error">${escapeHtml(error.message)}</div>`);
  }
}

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".segment").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.view = button.dataset.view;
    refresh();
  });
});

document.querySelector("#category").addEventListener("change", (event) => {
  state.category = event.target.value;
  refresh();
});

document.querySelector("#hours").addEventListener("change", (event) => {
  state.hours = event.target.value;
  refresh();
});

document.querySelector("#keyword").addEventListener("input", (event) => {
  state.q = event.target.value;
});

document.querySelector("#keyword").addEventListener("keydown", (event) => {
  if (event.key === "Enter") refresh();
});

document.querySelector("#refresh").addEventListener("click", refresh);
document.querySelector("#push").addEventListener("click", pushFeishu);

refresh();
