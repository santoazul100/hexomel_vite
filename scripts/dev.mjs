import http from "node:http";
import { spawn } from "node:child_process";

const backendUrl = "http://127.0.0.1:3000/health";

const children = new Set();
let shuttingDown = false;

function startProcess(name, args) {
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const commandArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", ["npm", ...args].join(" ")]
      : args;

  const child = spawn(command, commandArgs, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
  });

  children.add(child);

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${name}] ${chunk}`);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${name}] ${chunk}`);
  });

  child.on("exit", (code, signal) => {
    children.delete(child);
    if (!shuttingDown && code !== 0) {
      console.error(`[${name}] exited with ${signal || code}`);
      shutdown(code || 1);
    }
  });

  return child;
}

function checkBackend() {
  return new Promise((resolve) => {
    const req = http.get(backendUrl, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });

    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForBackend() {
  const timeoutAt = Date.now() + 60_000;

  while (Date.now() < timeoutAt) {
    if (await checkBackend()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  return false;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    child.kill("SIGTERM");
  }

  setTimeout(() => process.exit(code), 250);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("[dev] Starting backend...");
startProcess("backend", ["run", "dev", "--prefix", "backend"]);

console.log("[dev] Waiting for backend health check...");
if (!(await waitForBackend())) {
  console.error("[dev] Backend did not become ready within 60 seconds.");
  shutdown(1);
} else {
  console.log("[dev] Backend is ready. Starting frontend...");
  startProcess("frontend", ["run", "dev", "--prefix", "frontend"]);
}
