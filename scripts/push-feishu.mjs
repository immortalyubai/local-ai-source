#!/usr/bin/env node
import { buildDigest } from "../src/digest.mjs";
import { loadEnv } from "../src/env.mjs";
import { sendFeishuText } from "../src/feishu.mjs";

loadEnv();

function parseArgs(argv) {
  const options = { dryRun: false };
  for (const arg of argv) {
    if (arg === "--daily") options.type = "daily";
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg.startsWith("--date=")) options.date = arg.slice("--date=".length);
    else if (arg.startsWith("--mode=")) options.mode = arg.slice("--mode=".length);
    else if (arg.startsWith("--category=")) options.category = arg.slice("--category=".length);
    else if (arg.startsWith("--hours=")) options.hours = arg.slice("--hours=".length);
    else if (arg.startsWith("--take=")) options.take = arg.slice("--take=".length);
    else if (arg.startsWith("--q=")) options.q = arg.slice("--q=".length);
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
const result = await buildDigest(options);

if (options.dryRun) {
  console.log(result.markdown);
} else {
  await sendFeishuText(result.markdown);
  console.log("Sent AI digest to Feishu.");
}
