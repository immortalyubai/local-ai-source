#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const label = "com.local-ai-source.server";
const launchAgentsDir = path.join(os.homedir(), "Library", "LaunchAgents");
const plistPath = path.join(launchAgentsDir, `${label}.plist`);
const logsDir = path.join(root, "logs");
const uid = typeof process.getuid === "function" ? process.getuid() : Number(spawnSync("id", ["-u"], { encoding: "utf8" }).stdout.trim());
const nodePath = process.execPath;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  return {
    ok: result.status === 0,
    stdout: result.stdout?.trim(),
    stderr: result.stderr?.trim(),
    status: result.status
  };
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function plist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEscape(nodePath)}</string>
    <string>${xmlEscape(path.join(root, "src", "server.mjs"))}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${xmlEscape(root)}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${xmlEscape(path.join(logsDir, "server.log"))}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(path.join(logsDir, "server.err.log"))}</string>
</dict>
</plist>
`;
}

function unloadIfNeeded() {
  run("launchctl", ["bootout", `gui/${uid}/${label}`]);
  run("launchctl", ["bootout", `gui/${uid}`, plistPath]);
}

function uninstall() {
  unloadIfNeeded();
  if (fs.existsSync(plistPath)) fs.rmSync(plistPath);
  console.log(`Removed ${plistPath}`);
}

function install() {
  fs.mkdirSync(launchAgentsDir, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });
  fs.writeFileSync(plistPath, plist(), "utf8");

  unloadIfNeeded();
  const loaded = run("launchctl", ["bootstrap", `gui/${uid}`, plistPath]);
  if (!loaded.ok) {
    console.error(loaded.stderr || loaded.stdout || "launchctl bootstrap failed");
    process.exit(1);
  }

  run("launchctl", ["kickstart", "-k", `gui/${uid}/${label}`]);
  console.log(`Installed ${label}`);
  console.log(`Dashboard: http://localhost:8787`);
  console.log(`Logs: ${path.join(logsDir, "server.log")}`);
}

if (process.argv.includes("--uninstall")) uninstall();
else install();
