import crypto from "node:crypto";

function sign(secret, timestamp) {
  const stringToSign = `${timestamp}\n${secret}`;
  return crypto.createHmac("sha256", stringToSign).digest("base64");
}

function isSuccess(payload) {
  return payload?.StatusCode === 0 || payload?.code === 0 || payload?.status_code === 0;
}

export async function sendFeishuText(text, options = {}) {
  const webhook = options.webhook || process.env.FEISHU_WEBHOOK_URL;
  const secret = options.secret || process.env.FEISHU_BOT_SECRET;

  if (!webhook) {
    throw new Error("Missing FEISHU_WEBHOOK_URL. Copy .env.example to .env and fill your Feishu custom bot webhook.");
  }

  const body = {
    msg_type: "text",
    content: {
      text
    }
  };

  if (secret) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    body.timestamp = timestamp;
    body.sign = sign(secret, timestamp);
  }

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !isSuccess(payload)) {
    const message = payload?.msg || payload?.message || response.statusText;
    throw new Error(`Feishu webhook failed: ${message}`);
  }

  return payload;
}
