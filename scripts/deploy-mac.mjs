#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(__dirname, "..");
const targetRoot = process.env.LOCAL_AI_SOURCE_DEPLOY_DIR || path.join(os.homedir(), "local-ai-source");
const exclude = new Set([".git", "logs", "node_modules"]);

function shouldCopy(src) {
  const relative = path.relative(sourceRoot, src);
  if (!relative) return true;
  const [top] = relative.split(path.sep);
  return !exclude.has(top);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", stdio: "pipe" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) process.exit(result.status || 1);
}

fs.mkdirSync(targetRoot, { recursive: true });
fs.cpSync(sourceRoot, targetRoot, {
  recursive: true,
  force: true,
  filter: shouldCopy
});

console.log(`Synced project to ${targetRoot}`);
run(process.execPath, [path.join(targetRoot, "scripts", "install-mac-launch-agent.mjs")], targetRoot);
