# Ambient WebMCP Bridge Feasibility

**Experiment date:** 2026-08-28  
**Browser evidence:** Chrome for Testing 152.0.7977.64, arm64  
**Scope:** extension registration, browser registry visibility, mock invocation, CSP, Permissions Policy, origin isolation, and a harmless public origin

## Hypothesis

An extension with host permission can recognize an unmodified top-level page and call that page's `document.modelContext.registerTool()`. Because WebMCP's tool map belongs to the `Document`, a compatible browser consumer should see the registration as a capability of the current page even though extension code created it.

The controlled fixture contains no script at all. The only WebMCP implementation is the installed extension.

## WebMCP execution model

WebMCP is a 26 August 2026 Draft Community Group Report, not a W3C Standard. Each `Document` has an associated model context and tool map. `registerTool()` records a name, description, JSON Schema, annotations, and an execute callback. Tool execution is queued back to the tool owner's document and the returned JavaScript value is serialized as JSON.

The current API is `document.modelContext`; Chrome deprecated `navigator.modelContext` in Chrome 150. Registration is limited to secure contexts, Chrome requires an origin-isolated document, and the `tools` Permissions Policy defaults to `'self'`. A page can explicitly deny the feature with `Permissions-Policy: tools=()`.

Tools are document-scoped. Navigation destroys the old document and its tool surface. Cross-origin iframe sharing additionally requires Permissions Policy delegation and `exposedTo`, but OpenAI's current site-tools implementation does not discover tools in any iframe, same-origin or cross-origin. Ambient registration therefore has to target the top-level page for the OpenAI client.

Sources:

- [WebMCP Draft Community Group Report](https://webmachinelearning.github.io/webmcp/)
- [Chrome WebMCP overview](https://developer.chrome.com/docs/ai/webmcp)
- [Chrome imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [OpenAI Site tools documentation](https://learn.chatgpt.com/docs/webmcp)
- [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/)

## Browser extension execution model

Manifest V3 content scripts default to an isolated JavaScript world. That world cannot share JavaScript variables with the page, but it shares the underlying DOM. Chrome also supports `world: "MAIN"` for manifest content scripts and for `chrome.scripting.executeScript`. MAIN-world code shares the page's realm and can be observed or interfered with by page code.

The experiment produced an important positive result: on Chrome 152, an isolated content script could access `document.modelContext`, register both tools, and those tools were subsequently visible to `getTools()` in the page's MAIN world. MAIN-world injection was not technically required for this static bridge.

Chrome documents that the page's CSP applies in MAIN world. In this experiment, both a manifest MAIN content script and `executeScript({world: "MAIN"})` ran under `script-src 'none'` because the injected files used no eval, dynamic code generation, or external page script element. This is one version-specific result, not a general CSP bypass guarantee.

Host permission authorizes extension injection. It does not override WebMCP's Permissions Policy or origin-isolation checks.

Sources:

- [Chrome content scripts and isolated worlds](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [`chrome.scripting` API and execution worlds](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [Chrome 137 removal of command-line extension loading](https://developer.chrome.com/blog/extension-news-june-2025)

Architectural references inspected:

- [GoogleChromeLabs WebMCP tools and Model Context Tool Inspector](https://github.com/GoogleChromeLabs/webmcp-tools) observes page registrations; it is an inspector, not evidence that third-party extension registrations work in ChatGPT.
- [Customaise's extension/MCP bridge](https://github.com/getcustomaise/customaise-mcp) injects AgentScripts that register WebMCP-like tools on existing sites, but its own MCP server lists and calls those tools, so it does not independently prove native OpenAI site-tool discovery.
- [WebMCP readiness checker](https://github.com/chapter42/webmcp-readiness-checker) uses a `document_start` MAIN-world content script to observe registrations. It supports the world-selection mechanism but does not establish the Ambient Bridge trust model.

No experimental library or polyfill was copied into this spike.

## Experiments performed

The repeatable probe loaded the unpacked extension into a temporary Chrome for Testing profile, opened a fresh document for each case, queried `document.modelContext.getTools()` from the MAIN world through Chrome DevTools Protocol, and invoked a selected registered tool with `executeTool`. It then launched a fresh profile without the extension to test absence.

The probe demonstrates that Chrome's native document tool registry observes extension-created registrations across worlds and can invoke their callbacks. It does **not** demonstrate that an LLM agent selected the tool. The only browser-agent surface available during this task was ChatGPT's separate built-in browser; it could not host the unpacked Chrome extension. Accordingly, the agent-discovery column remains explicitly unverified.

## Results

| Experiment | Registration succeeds | Agent discovers tool | Invocation succeeds | Notes |
|------------|-----------------------|----------------------|---------------------|-------|
| Isolated content-script world | Yes | Not directly tested; MAIN-world registry sees both tools | Yes | MAIN injection is unnecessary in Chrome 152 for these callbacks. |
| Manifest content script, MAIN world | Yes | Not directly tested; registry sees both tools | Yes | Page-realm code is more exposed to malicious page interference. |
| `chrome.scripting.executeScript`, MAIN world | Yes | Not directly tested; registry sees both tools | Yes | Requires `scripting` plus host permission. |
| Ordinary CSP | Yes | Not directly tested; registry sees both tools | Yes | `default-src 'self'; script-src 'self'`. |
| Restrictive CSP, manifest MAIN | Yes | Not directly tested; registry sees both tools | Yes | `script-src 'none'` did not block the static manifest injection in Chrome 152. |
| Restrictive CSP, scripting MAIN | Yes | Not directly tested; registry sees both tools | Yes | No eval, dynamic import, or page script element was used. |
| `Permissions-Policy: tools=()` | No | No | No | `NotAllowedError`; extension privilege did not bypass page policy. |
| `Origin-Agent-Cluster: ?0` | No | No | No | `SecurityError`; host permission did not bypass origin isolation. |
| Same-origin top-level page | Yes | Not directly tested; registry sees both tools | Yes | Tools are attributed to the fixture document/origin. |
| Public third-party `https://example.com/` | Yes | Not directly tested; registry sees `get_page_context` | Yes | Unmodified page; static extension mapping; no personal data scraped. |
| Fresh browser profile without extension | No | No | No | A reload/fresh document without injection has no tools. |
| Iframe registration in OpenAI client | Not tested locally | No, by documented client limitation | No through site tools | OpenAI currently ignores WebMCP tools in all iframes. |

The mock `request_appointment` invocation returned:

```json
{
  "status": "request_received",
  "business": "Maria's Deep Cleaning",
  "service": "Deep Cleaning",
  "preferred_date": "2026-09-01",
  "preferred_time": "10:00 AM",
  "customer_name": "Test Customer",
  "mock": true
}
```

Raw concise evidence is stored at `experiments/ambient-webmcp-bridge/results/chrome-152.json`.

## Security and trust implications

**Origin attribution and provenance.** The registered tool belongs to the underlying page `Document`, so consumers see the website origin, not a distinct extension origin. WebMCP's registered-tool metadata does not provide an extension identifier. OpenAI says it ties invocations to the originating page and registration, but that is not proof that the page owner authored the tool. An ambient bridge can therefore make a page appear to endorse capabilities it never implemented.

**Capability spoofing and page-owner consent.** This architecture intentionally operates without page-owner code or consent. A page can opt out with `Permissions-Policy: tools=()`, and the experiment confirms that an extension cannot bypass that policy. Absence of an opt-out header is not affirmative consent.

**Business identity.** A URL match is not adequate proof that an extension's static business record is authoritative. Redirects, transferred domains, compromised pages, and multi-tenant paths can make mappings stale or wrong. A later product would need a signed, auditable mapping with explicit business verification, but that is outside this spike.

**User authorization.** Informational tools can be low risk when they return bounded static data. Transactional tools are qualitatively different. An extension must not convert page-session privileges into purchases, messages, bookings, or account changes without clear per-invocation user review and the website's own authorization and validation. This spike's appointment tool is a pure mock.

**Extension permissions.** Host permissions should be narrowly enumerated. `<all_urls>` would turn a tool-metadata bug, compromised update, or malicious configuration into a browser-wide capability injection risk. The test extension only permits localhost and `example.com`.

**Malicious-page interaction.** MAIN-world code can be inspected and interfered with by the host page. The isolated-world mechanism worked and is preferable for static extension-owned callbacks. Any page-derived input must still be treated as hostile. Diagnostics intentionally avoid logging a real customer's name or other sensitive arguments.

**Tool lifecycle.** A fresh page without the extension had no tools. MAIN-world code already injected into a live document may persist until navigation even if the extension is disabled, because the callback lives with that document. Acceptance must disable/remove the extension **and reload**. Immediate live-document revocation was not demonstrated.

**Tool provenance gap.** This is the central architectural limitation. The browser security model enforces origin and policy, but the current WebMCP surface does not communicate “registered by extension X on behalf of business Y.” A compatible agent can reason about the page origin and tool schema, not independently verify the bridge's business authority.

## Challenge viability

**B. VIABLE WITH CONSTRAINTS**

The mechanical part of the statement is true in Chrome 152: an extension can make an existing, unmodified top-level web page expose structured native WebMCP capabilities in the document registry, and Chrome can invoke them successfully. Isolated-world registration works, restrictive CSP does not inherently defeat the tested mechanisms, and an unmodified public third-party origin can receive a harmless static tool. The full agent-visible statement remains unproven until a compatible LLM agent discovers the injected registration in that same Chrome profile.

It is not yet a complete challenge proof. OpenAI's Challenge documentation directs testing to ChatGPT's in-app browser or Chrome with WebMCP enabled. This task produced Chrome-native registry and invocation evidence, but no LLM-agent discovery evidence, and no documented route was found to install the extension into ChatGPT's separate built-in browser. A submission would therefore need a supported compatible agent in the same Chrome instance, clear extension installation instructions, and an honest explanation that the ChatGPT built-in-browser path has not been proven.

The trust problem is more serious than the mechanics: tools are attributed to the page origin even though the page owner did not register them. That makes ambient informational augmentation plausible, but transactional capabilities inappropriate without explicit business provenance and user authorization.

## Recommended next architecture

Keep the experiment as an extension-only informational bridge and run one final manual acceptance in Chrome with a WebMCP-compatible agent that can use the same extension-enabled profile. Prefer isolated-world registration, top-level pages only, narrow host permissions, static read-only tools, and a visible extension-owned provenance/consent surface.

Do not build scheduling, authentication, onboarding, or a resolver backend until that agent test proves actual discovery. If the Challenge must work specifically in ChatGPT's built-in browser, retain the existing native-site WebMCP architecture instead of presenting the ambient extension as supported there.
