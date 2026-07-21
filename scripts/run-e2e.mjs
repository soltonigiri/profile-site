import { spawn } from "node:child_process";

const server = spawn(
  process.execPath,
  ["node_modules/wrangler/bin/wrangler.js", "pages", "dev", "public", "--port", "8790"],
  { env: process.env, stdio: ["ignore", "pipe", "pipe"] },
);

let serverOutput = "";
let testsStarted = false;
let startupTimer;

function stopServer() {
  if (!server.killed) server.kill("SIGTERM");
}

function fail(message) {
  if (testsStarted) return;
  testsStarted = true;
  clearTimeout(startupTimer);
  stopServer();
  console.error(message);
  if (serverOutput) console.error(serverOutput.trim());
  process.exitCode = 1;
}

function runTests() {
  if (testsStarted) return;
  testsStarted = true;
  clearTimeout(startupTimer);

  const tests = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test"], {
    env: process.env,
    stdio: "inherit",
  });

  tests.on("error", (error) => {
    stopServer();
    console.error(`Could not start Playwright: ${error.message}`);
    process.exitCode = 1;
  });
  tests.on("exit", (code, signal) => {
    stopServer();
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exitCode = code ?? 1;
  });
}

function inspectServerOutput(chunk) {
  serverOutput += chunk.toString();
  if (serverOutput.includes("Ready on")) runTests();
}

server.stdout.on("data", inspectServerOutput);
server.stderr.on("data", inspectServerOutput);
server.on("error", (error) => fail(`Could not start Wrangler: ${error.message}`));
server.on("exit", (code) => {
  if (!testsStarted) fail(`Wrangler exited before becoming ready (code ${code ?? "unknown"}).`);
});

startupTimer = setTimeout(() => {
  fail("Wrangler did not become ready within 120 seconds.");
}, 120_000);

process.on("SIGINT", () => {
  stopServer();
  process.exit(130);
});

process.on("SIGTERM", () => {
  stopServer();
  process.exit(143);
});
