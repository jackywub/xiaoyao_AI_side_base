import "server-only";

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const HERMES_TIMEOUT_MS = Number(process.env.HERMES_TIMEOUT_MS || 120000);

function hermesBinary() {
  const configured = process.env.HERMES_BIN;
  if (configured) return configured;
  const local = process.env.HOME ? `${process.env.HOME}/.local/bin/hermes` : "";
  return local && existsSync(local) ? local : "hermes";
}

export function runHermes(args: string[], timeoutMs = HERMES_TIMEOUT_MS) {
  return new Promise<{ ok: boolean; stdout: string; stderr: string; durationMs: number }>((resolve) => {
    const startedAt = Date.now();
    const child = spawn(hermesBinary(), args, {
      cwd: process.cwd(),
      env: { ...process.env, HERMES_SOURCE: "xiaoyao-personal-website" },
      shell: false
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve({ ok, stdout: stdout.trim(), stderr: stderr.trim(), durationMs: Date.now() - startedAt });
    };
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      stderr ||= "Hermes 响应超时。";
      finish(false);
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => { clearTimeout(timer); stderr ||= error.message; finish(false); });
    child.on("close", (code) => { clearTimeout(timer); finish(code === 0); });
  });
}

export function parseHermesStatus(output: string) {
  const currentModel = output.match(/^\s*Model:\s*(.+)$/m)?.[1]?.trim() || "";
  const provider = output.match(/^\s*Provider:\s*(.+)$/m)?.[1]?.trim() || "";
  return { currentModel, provider };
}

export function parseHermesChat(output: string) {
  let sessionId = "";
  const content = output.split(/\r?\n/).filter((line) => {
    const match = line.match(/^\s*session_id:\s*(\S+)/i);
    if (match) {
      sessionId = match[1];
      return false;
    }
    return true;
  }).join("\n").trim();
  return { content, sessionId };
}
