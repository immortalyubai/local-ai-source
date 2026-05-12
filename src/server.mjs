import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchDaily, fetchDailies, fetchItems } from "./aihotClient.mjs";
import { buildDigest } from "./digest.mjs";
import { loadEnv } from "./env.mjs";
import { sendFeishuText } from "./feishu.mjs";
import { itemsToRss } from "./rss.mjs";

loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const port = Number.parseInt(process.env.PORT || "8787", 10);
const cache = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/rss+xml; charset=utf-8",
  ".svg": "image/svg+xml"
};

function json(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function text(res, status, payload, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "content-type": contentType });
  res.end(payload);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function cached(key, ttlMs, loader) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < ttlMs) return hit.value;
  const value = await loader();
  cache.set(key, { time: Date.now(), value });
  return value;
}

function paramsFromUrl(url) {
  return Object.fromEntries(url.searchParams.entries());
}

async function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const target = path.normalize(path.join(publicDir, requested));
  if (!target.startsWith(publicDir)) {
    text(res, 403, "Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(target);
    const type = mimeTypes[path.extname(target)] || "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(data);
  } catch {
    text(res, 404, "Not found");
  }
}

async function handleApi(req, res, url) {
  if (url.pathname === "/api/health") {
    json(res, 200, { ok: true, upstream: process.env.AIHOT_BASE_URL || "https://aihot.virxact.com" });
    return;
  }

  if (url.pathname === "/api/items") {
    const params = paramsFromUrl(url);
    const data = await cached(`items:${url.search}`, 60_000, async () => (await fetchItems(params)).data);
    json(res, 200, data);
    return;
  }

  if (url.pathname === "/api/daily") {
    const date = url.searchParams.get("date");
    const data = await cached(`daily:${date || "latest"}`, 5 * 60_000, async () => (await fetchDaily(date)).data);
    json(res, 200, data);
    return;
  }

  if (url.pathname === "/api/dailies") {
    const take = url.searchParams.get("take") || 30;
    const data = await cached(`dailies:${take}`, 5 * 60_000, async () => (await fetchDailies(take)).data);
    json(res, 200, data);
    return;
  }

  if (url.pathname === "/api/digest") {
    const options = paramsFromUrl(url);
    const result = await buildDigest(options);
    json(res, 200, result);
    return;
  }

  if (url.pathname === "/api/feishu/send" && req.method === "POST") {
    const body = await readJson(req);
    const result = await buildDigest(body);
    const payload = await sendFeishuText(result.markdown);
    json(res, 200, { ok: true, payload });
    return;
  }

  text(res, 404, "Not found");
}

async function handleRss(req, res, url) {
  const params = paramsFromUrl(url);
  const data = await cached(`rss:${url.search}`, 60_000, async () => (await fetchItems(params)).data);
  const selfUrl = `http://${req.headers.host || `localhost:${port}`}${url.pathname}${url.search}`;
  text(res, 200, itemsToRss(data.items, { selfUrl, title: "Local AI Source" }), "application/rss+xml; charset=utf-8");
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    if (url.pathname === "/feed.xml") {
      await handleRss(req, res, url);
      return;
    }
    await serveStatic(req, res, url);
  } catch (error) {
    json(res, 500, { error: error.message || "Internal server error" });
  }
});

server.listen(port, () => {
  console.log(`Local AI Source running at http://localhost:${port}`);
});
