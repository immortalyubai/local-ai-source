const DEFAULT_BASE_URL = "https://aihot.virxact.com";
const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const CATEGORIES = {
  "ai-models": "模型发布/更新",
  "ai-products": "产品发布/更新",
  industry: "行业动态",
  paper: "论文研究",
  tip: "技巧与观点"
};

export const CATEGORY_ORDER = ["ai-models", "ai-products", "industry", "paper", "tip"];

export function baseUrl() {
  return (process.env.AIHOT_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export function sinceHours(hours = 24) {
  const n = Number(hours);
  const safeHours = Number.isFinite(n) && n > 0 ? Math.min(n, 24 * 7) : 24;
  return new Date(Date.now() - safeHours * 60 * 60 * 1000).toISOString();
}

export function sanitizeItemsParams(params = {}) {
  const clean = {};
  const mode = params.mode === "all" ? "all" : "selected";
  clean.mode = mode;

  if (params.category && CATEGORIES[params.category]) {
    clean.category = params.category;
  }

  if (params.q && String(params.q).trim().length >= 2) {
    clean.q = String(params.q).trim().slice(0, 200);
  }

  if (params.since) {
    clean.since = String(params.since);
  } else if (params.hours) {
    clean.since = sinceHours(params.hours);
  }

  const take = Number.parseInt(params.take || "50", 10);
  clean.take = Number.isFinite(take) ? Math.min(Math.max(take, 1), 100) : 50;

  if (params.cursor) {
    clean.cursor = String(params.cursor);
  }

  return clean;
}

export async function aihotRequest(pathname, params = {}, options = {}) {
  const url = new URL(pathname, baseUrl());
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": process.env.AIHOT_USER_AGENT || DEFAULT_UA,
      ...(options.etag ? { "if-none-match": options.etag } : {})
    }
  });

  if (response.status === 304) {
    return {
      status: 304,
      etag: response.headers.get("etag"),
      data: null,
      url: url.toString()
    };
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const message = data?.error || data?.raw || response.statusText;
    throw new Error(`AIHOT API ${response.status}: ${message}`);
  }

  return {
    status: response.status,
    etag: response.headers.get("etag"),
    cacheControl: response.headers.get("cache-control"),
    data,
    url: url.toString()
  };
}

export async function fetchItems(params = {}, options = {}) {
  return aihotRequest("/api/public/items", sanitizeItemsParams(params), options);
}

export async function fetchDaily(date) {
  const path = date ? `/api/public/daily/${encodeURIComponent(date)}` : "/api/public/daily";
  return aihotRequest(path);
}

export async function fetchDailies(take = 30) {
  const n = Number.parseInt(take, 10);
  return aihotRequest("/api/public/dailies", {
    take: Number.isFinite(n) ? Math.min(Math.max(n, 1), 180) : 30
  });
}
