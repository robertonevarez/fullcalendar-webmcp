/**
 * Packed-artifact smoke: exercise the six calendar tools against the
 * published tarball's dist (not TypeScript source). Invoked from test-pack.js
 * after `npm pack`.
 *
 * Usage: node ./scripts/smoke-packed-tools.mjs <tarball.tgz>
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const tarballArg = process.argv[2];
if (!tarballArg) {
  console.error("Usage: node ./scripts/smoke-packed-tools.mjs <tarball.tgz>");
  process.exit(1);
}

const tarballPath = path.isAbsolute(tarballArg)
  ? tarballArg
  : path.join(rootDir, tarballArg);

if (!fs.existsSync(tarballPath)) {
  console.error(`Missing tarball: ${tarballPath}`);
  process.exit(1);
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "fullcalendar-pack-smoke-"));

try {
  // Install the packed artifact into a clean consumer so peer deps resolve.
  const consumerPkg = {
    name: "fullcalendar-pack-smoke-consumer",
    private: true,
    type: "module",
    dependencies: {
      "@protocoltooling/fullcalendar": `file:${tarballPath}`,
      "@fullcalendar/react": "7.0.2",
      react: "19.2.8",
      "react-dom": "19.2.8",
    },
  };
  fs.writeFileSync(
    path.join(workDir, "package.json"),
    `${JSON.stringify(consumerPkg, null, 2)}\n`,
  );
  execSync("npm install --ignore-scripts --no-audit --no-fund", {
    cwd: workDir,
    stdio: "inherit",
  });

  const distEntry = path.join(
    workDir,
    "node_modules",
    "@protocoltooling",
    "fullcalendar",
    "dist",
    "index.js",
  );
  if (!fs.existsSync(distEntry)) {
    throw new Error(`Packed package missing dist/index.js at ${distEntry}`);
  }

  // Dist must contain the optional-signal contract (guards transpile regressions).
  const distSource = fs.readFileSync(distEntry, "utf8");
  if (!distSource.includes("executeOptions") && !distSource.includes("?.signal")) {
    throw new Error(
      "Packed dist does not include optional executeOptions/?.signal contract.",
    );
  }
  if (/async execute\([^)]*\{\s*signal\s*\}/.test(distSource)) {
    throw new Error(
      "Packed dist still required-destructures { signal } — 0.1.0 failure mode.",
    );
  }

  const dom = new JSDOM(
    "<!doctype html><html><body><div id='root'></div></body></html>",
    {
      url: "http://localhost/",
      pretendToBeVisual: true,
    },
  );
  const { window } = dom;
  Object.defineProperty(globalThis, "window", { value: window, configurable: true });
  Object.defineProperty(globalThis, "document", {
    value: window.document,
    configurable: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    value: window.navigator,
    configurable: true,
  });
  Object.defineProperty(globalThis, "HTMLElement", {
    value: window.HTMLElement,
    configurable: true,
  });
  Object.defineProperty(globalThis, "MutationObserver", {
    value: window.MutationObserver,
    configurable: true,
  });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    value: true,
    configurable: true,
  });

  class FakeModelContext extends EventTarget {
    tools = new Map();
    ontoolchange = null;
    async registerTool(tool, options = {}) {
      if (this.tools.has(tool.name)) {
        throw new DOMException(`Duplicate tool: ${tool.name}`, "InvalidStateError");
      }
      this.tools.set(tool.name, tool);
      options.signal?.addEventListener?.(
        "abort",
        () => this.tools.delete(tool.name),
        { once: true },
      );
    }
    async executeTool(name, input = {}) {
      const tool = this.tools.get(name);
      if (!tool) throw new Error(`Missing tool: ${name}`);
      const parsed = JSON.parse(JSON.stringify(input));
      return tool.execute(parsed, { signal: new AbortController().signal });
    }
  }

  const context = new FakeModelContext();
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: context,
  });

  const consumerReact = await import(
    pathToFileURL(path.join(workDir, "node_modules/react/index.js")).href
  );
  const consumerReactDomClient = await import(
    pathToFileURL(path.join(workDir, "node_modules/react-dom/client.js")).href
  );
  const { useFullCalendarWebMCP } = await import(pathToFileURL(distEntry).href);

  const events = new Map();
  const repository = {
    async list() {
      return [...events.values()];
    },
    async get(id) {
      return events.get(id) ?? null;
    },
    async create(input) {
      const event = {
        id: "packed-smoke-event",
        title: input.title,
        start: new Date(input.start).toISOString(),
        end: input.end ? new Date(input.end).toISOString() : null,
        allDay: Boolean(input.allDay),
      };
      events.set(event.id, event);
      return event;
    },
    async update(id, input) {
      const current = events.get(id);
      if (!current) throw new Error(`missing ${id}`);
      const next = {
        ...current,
        ...input,
        start: input.start ? new Date(input.start).toISOString() : current.start,
        end:
          input.end === undefined
            ? current.end
            : input.end
              ? new Date(input.end).toISOString()
              : null,
      };
      events.set(id, next);
      return next;
    },
    async delete(id) {
      if (!events.delete(id)) throw new Error(`missing ${id}`);
    },
  };

  const calendarRef = {
    current: {
      getApi: () => ({
        getOption: () => "UTC",
        view: {
          type: "dayGridMonth",
          activeStart: new Date("2026-09-01T00:00:00.000Z"),
          activeEnd: new Date("2026-10-01T00:00:00.000Z"),
        },
      }),
    },
  };

  function Host() {
    useFullCalendarWebMCP({
      calendarRef,
      events: repository,
      onEventsChanged: async () => [...events.values()],
    });
    return null;
  }

  const root = consumerReactDomClient.createRoot(document.getElementById("root"));
  await consumerReact.act(async () => {
    root.render(consumerReact.createElement(Host));
    const deadline = Date.now() + 5000;
    while (context.tools.size < 6 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
    }
  });

  if (context.tools.size !== 6) {
    throw new Error(
      `Expected 6 registered tools from packed artifact, got ${context.tools.size}`,
    );
  }

  const names = [...context.tools.keys()].sort();
  const expected = [
    "calendar_create_event",
    "calendar_delete_event",
    "calendar_get_context",
    "calendar_get_event",
    "calendar_list_events",
    "calendar_update_event",
  ];
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected tool set: ${names.join(", ")}`);
  }

  // One-arg shim against every registered callback (0.1.0 crash shape).
  for (const [name, tool] of context.tools) {
    try {
      if (name === "calendar_create_event") {
        await tool.execute({
          title: "Packed Create",
          start: "2026-09-02T14:00:00-06:00",
          end: "2026-09-02T15:00:00-06:00",
        });
      } else if (name === "calendar_update_event") {
        await tool.execute({
          id: "packed-smoke-event",
          title: "Packed Updated",
        });
      } else if (name === "calendar_delete_event") {
        if (events.has("packed-smoke-event")) {
          await tool.execute({ id: "packed-smoke-event" });
        }
      } else if (name === "calendar_get_event") {
        await tool.execute({ id: "missing" });
      } else {
        await tool.execute({});
      }
    } catch (error) {
      if (String(error?.message || error).includes("Cannot destructure")) {
        throw new Error(`${name} failed one-arg execute: ${error.message}`, {
          cause: error,
        });
      }
    }
  }

  events.clear();
  const contextResult = await context.executeTool("calendar_get_context", {});
  if (contextResult.view !== "dayGridMonth") {
    throw new Error(`Unexpected context view: ${contextResult.view}`);
  }

  const listed = await context.executeTool("calendar_list_events", {});
  if (!Array.isArray(listed.events) || listed.events.length !== 0) {
    throw new Error("Expected empty list before create");
  }

  const created = await context.executeTool("calendar_create_event", {
    title: "Packed Sequence",
    start: "2026-09-02T14:00:00-06:00",
    end: "2026-09-02T15:00:00-06:00",
  });
  if (created.event.id !== "packed-smoke-event") {
    throw new Error(`Unexpected created id: ${created.event.id}`);
  }

  const got = await context.executeTool("calendar_get_event", {
    id: "packed-smoke-event",
  });
  if (got.event?.title !== "Packed Sequence") {
    throw new Error("calendar_get_event did not return created event");
  }

  const updated = await context.executeTool("calendar_update_event", {
    id: "packed-smoke-event",
    title: "Packed Sequence Updated",
  });
  if (updated.event.title !== "Packed Sequence Updated") {
    throw new Error("calendar_update_event failed");
  }

  await context.executeTool("calendar_delete_event", {
    id: "packed-smoke-event",
  });
  if (events.size !== 0) {
    throw new Error("calendar_delete_event left residual events");
  }

  root.unmount();
  console.log("✓ Packed artifact smoke passed (six tools + one-arg + sequence).");
} finally {
  fs.rmSync(workDir, { recursive: true, force: true });
}
