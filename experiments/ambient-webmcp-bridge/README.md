# Ambient WebMCP Bridge experiment

This self-contained spike tests whether a Manifest V3 extension can register WebMCP tools on an unmodified page. It does not use the Protocol Tooling application, database, authentication, scheduling, or email infrastructure.

## Contents

- `fixture/` is a static legacy-business page. It contains no JavaScript, Protocol Tooling code, or WebMCP registration.
- `extension/` is an unpacked Manifest V3 extension with three selectable registration mechanisms.
- `server.mjs` serves the same static fixture under independently controlled CSP, Permissions Policy, and origin-isolation headers.
- `probe.mjs` drives the repeatable Chrome registry and invocation matrix.
- `results/chrome-152.json` is the concise result captured on 2026-08-28.

## Run the fixture

```bash
node experiments/ambient-webmcp-bridge/server.mjs
```

The ordinary fixture is at <http://127.0.0.1:4173/legacy/ordinary>.

## Load the extension manually

1. Use Chrome 152 or newer and enable `chrome://flags/#enable-webmcp-testing`.
2. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `experiments/ambient-webmcp-bridge/extension`.
3. Open one of the fixture URLs below.
4. Inspect the page console for messages prefixed with `protocol-tooling ambient-webmcp`.
5. Use a WebMCP-capable agent in that Chrome instance or Google's Model Context Tool Inspector to inspect and call the registered tools.

The extension deliberately requests host access only for `127.0.0.1`, `localhost`, and `https://example.com`.

## Registration modes

| URL query | Mechanism |
|---|---|
| `?bridge=isolated` | Normal isolated content script calls `document.modelContext.registerTool` |
| `?bridge=main-static` | Manifest content script with `world: "MAIN"` (default) |
| `?bridge=main-execute` | Isolated controller asks the service worker to call `chrome.scripting.executeScript` with `world: "MAIN"` |

Useful fixture URLs:

- `/legacy/ordinary?bridge=isolated`
- `/legacy/ordinary?bridge=main-static`
- `/legacy/ordinary?bridge=main-execute`
- `/legacy/restrictive-csp?bridge=main-static`
- `/legacy/permissions-denied?bridge=main-static`
- `/legacy/origin-isolation-disabled?bridge=main-static`

On the local business fixture, exactly two tools register: `get_business_info` and `request_appointment`. The latter returns mock structured data and has no external side effect. On `https://example.com/`, the extension registers one harmless static `get_page_context` tool.

## Automated registry probe

Branded Chrome removed command-line unpacked-extension loading in Chrome 137. Use an official Chrome for Testing binary for automation:

```bash
AMBIENT_WEBMCP_CHROME_PATH="/absolute/path/to/Google Chrome for Testing" \
  node experiments/ambient-webmcp-bridge/probe.mjs
```

The probe starts a temporary fixture server and browser profile, loads the unpacked extension, queries `document.modelContext.getTools()`, invokes a tool through `executeTool`, and destroys the temporary profiles. It does not constitute an LLM-agent discovery test.

## Manual agent acceptance

The final acceptance step must happen in a browser that simultaneously supports the Protocol Tooling extension and a WebMCP-compatible agent:

1. Confirm the static fixture source has no WebMCP code.
2. Confirm the agent lists `get_business_info` as a site tool, not a DOM-derived action.
3. Ask the agent to invoke it and verify the structured business payload.
4. Ask it to invoke `request_appointment` with obviously fake input and verify `status: "request_received"` and `mock: true`.
5. Disable/remove the extension, reload the page, and confirm both tools disappear.

ChatGPT's built-in browser is a separate browser surface from Chrome. No documented mechanism was found for loading this unpacked Chrome extension into that surface, so Chrome registration results must not be presented as proof of ChatGPT built-in-browser discovery.
