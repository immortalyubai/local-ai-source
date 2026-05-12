function xmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cdata(value) {
  return String(value || "").replaceAll("]]>", "]]]]><![CDATA[>");
}

export function itemsToRss(items, options = {}) {
  const title = options.title || "Local AI Source";
  const selfUrl = options.selfUrl || "http://localhost:8787/feed.xml";
  const now = new Date().toUTCString();

  const body = (items || [])
    .map((item) => {
      const pubDate = item.publishedAt ? new Date(item.publishedAt).toUTCString() : now;
      return `    <item>
      <title><![CDATA[${cdata(item.title)}]]></title>
      <link>${xmlEscape(item.url)}</link>
      <description><![CDATA[${cdata(item.summary || "")}]]></description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">${xmlEscape(item.id || item.url)}</guid>
      <author>noreply@local-ai-source (${xmlEscape(item.source || "AIHOT")})</author>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(title)}</title>
    <link>${xmlEscape(selfUrl)}</link>
    <description>本地 AI 信息源转发，数据来自 AIHOT 公共 API。</description>
    <language>zh-CN</language>
    <atom:link href="${xmlEscape(selfUrl)}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${now}</lastBuildDate>
${body}
  </channel>
</rss>`;
}
