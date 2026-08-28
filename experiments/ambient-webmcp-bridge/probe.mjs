import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const experimentRoot = fileURLToPath(new URL("./", import.meta.url));
const extensionPath = resolve(experimentRoot, "extension");
const chromePath =
  process.env.AMBIENT_WEBMCP_CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const debuggingPort = 9338;
const serverPort = 4173;

const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

async function waitForJson(url, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

async function waitForHttp(url, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The fixture process may still be starting.
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class CdpSession {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.socket = new WebSocket(url);
  }

  async connect() {
    await new Promise((resolveConnection, rejectConnection) => {
      this.socket.addEventListener("open", resolveConnection, { once: true });
      this.socket.addEventListener("error", rejectConnection, { once: true });
    });
    this.socket.addEventListener("message", (message) => {
      const payload = JSON.parse(message.data);
      if (payload.id) {
        const callbacks = this.pending.get(payload.id);
        if (!callbacks) return;
        this.pending.delete(payload.id);
        if (payload.error) callbacks.reject(new Error(payload.error.message));
        else callbacks.resolve(payload.result);
        return;
      }
      this.events.push(payload);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolveMessage, rejectMessage) => {
      this.pending.set(id, { resolve: resolveMessage, reject: rejectMessage });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function newTarget(url) {
  const response = await fetch(
    `http://127.0.0.1:${debuggingPort}/json/new?${encodeURIComponent(url)}`,
    { method: "PUT" },
  );
  if (!response.ok) throw new Error(`Could not create target: HTTP ${response.status}`);
  return response.json();
}

async function runProbe(name, url, invocation) {
  const target = await newTarget(url);
  const session = new CdpSession(target.webSocketDebuggerUrl);
  await session.connect();
  await session.send("Runtime.enable");
  await session.send("Page.enable");
  await delay(1_200);

  const expression = `
    (async () => {
      const modelContext = document.modelContext;
      if (!modelContext) return { api: false, tools: [], invocation: null };
      try {
        const tools = await modelContext.getTools();
        const names = tools.map((tool) => tool.name);
        const selected = tools.find((tool) => tool.name === ${JSON.stringify(invocation?.tool)});
        let invocationResult = null;
        if (selected) {
          const raw = await modelContext.executeTool(selected, JSON.stringify(${JSON.stringify(invocation?.input || {})}));
          try { invocationResult = JSON.parse(raw); } catch { invocationResult = raw; }
        }
        return { api: true, tools: names, invocation: invocationResult };
      } catch (error) {
        return { api: true, tools: [], invocation: null, error: error.name + ': ' + error.message };
      }
    })()
  `;

  const evaluation = await session.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  const value = evaluation.result?.value || {
    evaluationError: evaluation.exceptionDetails?.text || "Unknown evaluation failure",
  };
  const consoleEvents = session.events
    .filter((event) => event.method === "Runtime.consoleAPICalled")
    .map((event) => event.params.args.map((arg) => arg.value || arg.description).join(" "))
    .filter((line) => line.includes("protocol-tooling"));

  session.close();
  await fetch(`http://127.0.0.1:${debuggingPort}/json/close/${target.id}`);
  return { name, url, ...value, diagnostics: consoleEvents };
}

async function launchChrome({ withExtension, profilePath }) {
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${profilePath}`,
    `--remote-debugging-port=${debuggingPort}`,
    "--remote-allow-origins=*",
    "--enable-features=WebMCP,WebMCPForTesting",
  ];
  if (withExtension) {
    args.push(`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`);
  }
  args.push("about:blank");
  const child = spawn(chromePath, args, { stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  await waitForJson(`http://127.0.0.1:${debuggingPort}/json/version`);
  return { child, stderr: () => stderr };
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolveExit) => child.once("exit", resolveExit)),
    delay(2_000).then(() => child.kill("SIGKILL")),
  ]);
}

const server = spawn(process.execPath, [join(experimentRoot, "server.mjs")], {
  env: { ...process.env, AMBIENT_WEBMCP_PORT: String(serverPort) },
  stdio: ["ignore", "pipe", "pipe"],
});
const profilePath = await mkdtemp(join(tmpdir(), "protocol-tooling-webmcp-"));
let chrome;

try {
  await waitForHttp(`http://127.0.0.1:${serverPort}/legacy/ordinary`);
  chrome = await launchChrome({ withExtension: true, profilePath });

  const businessInvocation = { tool: "get_business_info", input: {} };
  const results = [];
  results.push(await runProbe("isolated world", `http://127.0.0.1:${serverPort}/legacy/ordinary?bridge=isolated`, businessInvocation));
  results.push(await runProbe("manifest MAIN world", `http://127.0.0.1:${serverPort}/legacy/ordinary?bridge=main-static`, businessInvocation));
  results.push(await runProbe("structured mock appointment", `http://127.0.0.1:${serverPort}/legacy/ordinary?bridge=main-static`, {
    tool: "request_appointment",
    input: {
      service: "Deep Cleaning",
      preferred_date: "2026-09-01",
      preferred_time: "10:00 AM",
      customer_name: "Test Customer",
    },
  }));
  results.push(await runProbe("scripting MAIN world", `http://127.0.0.1:${serverPort}/legacy/ordinary?bridge=main-execute`, businessInvocation));
  results.push(await runProbe("ordinary CSP", `http://127.0.0.1:${serverPort}/legacy/ordinary?bridge=main-static`, businessInvocation));
  results.push(await runProbe("restrictive CSP", `http://127.0.0.1:${serverPort}/legacy/restrictive-csp?bridge=main-static`, businessInvocation));
  results.push(await runProbe("restrictive CSP via scripting MAIN", `http://127.0.0.1:${serverPort}/legacy/restrictive-csp?bridge=main-execute`, businessInvocation));
  results.push(await runProbe("permissions denied", `http://127.0.0.1:${serverPort}/legacy/permissions-denied?bridge=main-static`, businessInvocation));
  results.push(await runProbe("origin isolation disabled", `http://127.0.0.1:${serverPort}/legacy/origin-isolation-disabled?bridge=main-static`, businessInvocation));
  results.push(await runProbe("public third-party origin", "https://example.com/?bridge=main-static", { tool: "get_page_context", input: {} }));

  await stopChild(chrome.child);
  chrome = undefined;
  await rm(profilePath, { recursive: true, force: true });
  const noExtensionProfile = await mkdtemp(join(tmpdir(), "protocol-tooling-webmcp-none-"));
  chrome = await launchChrome({ withExtension: false, profilePath: noExtensionProfile });
  results.push(await runProbe("extension removed", `http://127.0.0.1:${serverPort}/legacy/ordinary`, businessInvocation));
  await stopChild(chrome.child);
  chrome = undefined;
  await rm(noExtensionProfile, { recursive: true, force: true });

  console.log(JSON.stringify({ chromePath, results }, null, 2));
} catch (error) {
  const browserLog = chrome?.stderr() || "";
  console.error(error);
  if (browserLog) console.error(browserLog.slice(-6_000));
  process.exitCode = 1;
} finally {
  if (chrome) await stopChild(chrome.child);
  await stopChild(server);
  await rm(profilePath, { recursive: true, force: true });
}
