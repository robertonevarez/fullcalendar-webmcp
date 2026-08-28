# Ambient Bridge Without User Extension

**Investigation date:** 2026-08-28  
**Primary question:** Can Protocol Tooling associate externally supplied business capabilities with an unmodified third-party page without a user-installed extension and without presenting those capabilities as page-authored?

## Desired architecture

```text
Unmodified third-party page
        |
        v
Agent/browser observes the current URL
        |
        v
Protocol Tooling supplies business-specific capabilities
        |
        v
Agent invokes a read-only tool with explicit Protocol Tooling provenance
```

The strongest supported answer has two different meanings:

1. **As native, page-scoped WebMCP:** no supported zero-extension mechanism was found. Current WebMCP registration lives on `Document.modelContext`; ChatGPT Site Tools are tools the current page provides.
2. **As an agent experience:** yes, a custom or appropriately configured agent can observe a URL, pass it to an external Protocol Tooling MCP resolver, and invoke the returned agent-scoped tools. That is ordinary MCP/tool composition, not WebMCP.

## Definitions

- **Native WebMCP:** A website's top-level document registers JavaScript tools through `document.modelContext`. A compatible browser agent discovers and invokes tools bound to that live document.
- **Ambient WebMCP:** The proposed Protocol Tooling behavior in which capabilities appear while an agent views a third-party page that did not register them. This is a product concept, not a current WebMCP API term.
- **Browser extension injection:** An installed extension executes code in a matched page and calls that document's WebMCP API. The prior spike proved the mechanics in Chrome, but the resulting provenance is the page origin rather than a distinct provider identity.
- **External MCP:** A local or remote MCP server exposes tools to an AI application independently of any webpage. Its tool calls are agent-scoped and identify the MCP server/provider.
- **Agent-side capability adapter:** Agent orchestration that reads or receives a page URL, calls an external resolver, and then exposes or invokes capabilities associated with the resolver's business record.
- **Zero-install:** No Protocol Tooling browser extension, bookmarklet, local helper, certificate, proxy, or PWA is installed by the end user. A provider-hosted browser or preconfigured custom agent can meet this definition. Installing or connecting a ChatGPT plugin/MCP app is minimal setup, but not zero setup.

The term **page-scoped** is reserved for a capability whose availability and lifecycle are bound by the browser to the current page/document. An MCP tool that accepts a URL argument is not page-scoped merely because the argument names the current page.

## OpenAI / ChatGPT findings

### Site Tools are page-provided WebMCP

OpenAI documents Site Tools as ChatGPT's implementation of WebMCP. The documented producer is the website: the page registers JavaScript through `document.modelContext.registerTool()`, the built-in browser discovers those tools, and each tool belongs to the page that provides it. Navigating away or closing the page makes it unavailable. The browser ties invocations to the originating page and registration. [OpenAI Site Tools documentation](https://learn.chatgpt.com/docs/webmcp)

No supported OpenAI API was found for a third-party service to add Site Tools to somebody else's live page. The documented registration example runs in the website's JavaScript module, and the documented limitations do not describe an external provider registry, remote manifest, browser middleware hook, or URL-to-Site-Tool mapping.

### Site Tools and connected MCP tools are separate surfaces

OpenAI explicitly distinguishes them:

- WebMCP lets a **website** make tools discoverable when the agent visits.
- MCP connects an AI application to a local or remote server and works independently of an open page.

Remote MCP in the Responses API is configured as a model tool with a `server_url`, label, description, and approval policy. Tool arguments are produced by the model/application. The documented MCP configuration contains no ambient browser tab, current URL, `Document`, or Site Tools registration field. [OpenAI MCP and Connectors guide](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)

ChatGPT and Codex plugins can package an MCP server, but they are installable capabilities. OpenAI describes a plugin MCP integration as operating independently of the open page. [OpenAI plugin documentation](https://learn.chatgpt.com/docs/build-plugins)

Consequently:

- A Protocol Tooling MCP server can define `resolve_business({ url })`.
- The agent can call it if the URL is in model context or is obtained with a browser tool.
- No current OpenAI documentation promises that ChatGPT automatically sends the active in-app-browser URL to connected MCP tools.
- No documented rule dynamically enables an MCP tool only for a matching webpage.
- The MCP call remains attributed to the MCP/plugin provider, not to Facebook, Google, Shopify, or the visited page.

### In-app-browser experiment

The ChatGPT desktop in-app browser opened the unchanged test page at `http://127.0.0.1:4173/legacy/ordinary`. Its WebMCP capability reported:

```text
No WebMCP tools are available in this document.
```

The browser did expose the tab URL to the agent's separate browser-control surface. That allowed the agent to pass the URL explicitly to the MCP proof. It did not cause the MCP tools to appear as Site Tools and did not demonstrate an automatic browser-to-MCP context channel.

### Challenge-specific behavior

The Challenge page says WebMCP lets websites expose structured tools and directs testing to ChatGPT's in-app browser or Chrome with WebMCP enabled. Judging includes thoughtful use of WebMCP. It does not document a challenge-only external provider registry or a privileged way to attach tools to arbitrary pages. [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/)

Ordinary MCP alone should therefore not be represented as a WebMCP Challenge implementation.

## Browser-native findings

The current WebMCP Draft Community Group Report defines the API as an extension to `Document`. `Document.modelContext` owns the registration, discovery, execution, and lifecycle methods. The IDL does not define a browser-global provider registry, profile-level MCP provider, external tool manifest, enterprise tool mapping, worker-based registry, or remote registration API. The report is a Community Group draft, not a W3C Standard. [WebMCP Draft Community Group Report](https://webmachinelearning.github.io/webmcp/)

Chrome's current developer guide describes two website APIs:

- Imperative tools registered with page JavaScript.
- Declarative tools synthesized from page forms.

Chrome says clients must visit a site to know whether it has tools, WebMCP is gated by origin isolation and the `tools` Permissions Policy, and the local flag merely enables WebMCP for development. It does not configure external providers. [Chrome WebMCP guide](https://developer.chrome.com/docs/ai/webmcp)

`getTools()` returns a tool origin and, by default, same-origin tools registered within the document tree. Cross-origin discovery is about another document in that tree and requires explicit `fromOrigins`/`exposedTo` coordination; it is not a browser-level URL registry. [Chrome imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)

### Mechanisms checked

- **Global browser WebMCP registry:** none in the current IDL or Chrome documentation.
- **User-configured or remote tool provider:** none documented for native WebMCP.
- **Browser profile MCP server registry:** none documented as a Chrome/WebMCP feature.
- **Enterprise policy:** Chrome enterprise policy can control browser settings and force-install extensions, but no documented policy was found that registers WebMCP tools or MCP providers for URL patterns. Force-installing an extension remains extension distribution.
- **Browser flags/origin trials:** enable the WebMCP implementation for pages; they do not supply tools.
- **DevTools/CDP:** automation can evaluate JavaScript in a page, but that is automation-mediated page modification, requires a debugging channel, is not a supported ambient provider API, and inherits the same provenance problem as extension injection.
- **Service/shared workers:** the current `Document` API does not permit an unrelated service worker to control or register tools for a third-party origin. Persistent worker registration is still an open design discussion, not a shipped external-provider solution.
- **Browser-native MCP:** browser automation can itself be exposed as MCP, but that makes browser actions agent tools; it does not add WebMCP tools to the visited document.

The answer to the Chrome-specific question is therefore **no**: current Chrome cannot be configured to say “for this Facebook path, expose these Protocol Tooling WebMCP tools” without page code, an extension, or nonstandard automation/injection.

## MCP bridge findings

Ordinary MCP can produce a similar read-only user journey if the agent has both a browser capability and a Protocol Tooling server.

| Test | Result | Context transfer | Scope | Provenance |
|---|---|---|---|---|
| A. Agent explicitly passes current URL | Works in the proof | Explicit `url` tool argument | Agent-scoped | Protocol Tooling MCP server |
| B. Browser automatically exposes current URL to MCP | Not documented or demonstrated | None found | N/A | N/A |
| C. `resolve_business({ url })` | Works in the proof | Explicit `url` tool argument | Agent-scoped | Protocol Tooling MCP server |
| D. Browser/computer-use agent reads URL, then calls MCP | Feasible in a custom agent; manually orchestrated here | Agent composes two independent tools | Agent-scoped | Browser source plus Protocol Tooling MCP source |

User setup differs by host:

- **Stock ChatGPT with a Protocol Tooling plugin:** the user must discover/install/connect the plugin and grant requested access. No automatic current-page handoff is documented.
- **Responses API custom agent:** the developer configures the remote MCP server and browser/computer-use tools. The end user installs nothing locally, but uses the custom agent rather than stock Site Tools.
- **Custom Chrome-based agent:** the agent bundles browser automation and the resolver. No Protocol Tooling page extension is necessary if it controls its own browser, but the user still needs that agent product unless it is hosted.
- **Hosted browser agent:** the provider can preconfigure both capabilities and deliver a zero-local-install experience. The capability remains agent-scoped ordinary MCP.

MCP itself standardizes tool listing and calling, not how a client obtains browser context. The client/model controls tool selection; applications are expected to identify exposed tools and keep a human in the loop. [MCP tools specification](https://modelcontextprotocol.io/specification/draft/server/tools)

Existing implementations establish that navigation and external MCP can coexist. Microsoft's Playwright MCP exposes browser automation to MCP clients, and Browserless exposes a stateful browser-agent tool. They support the composition pattern but do not turn a separate business MCP server into page-authored WebMCP. [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp), [Browserless Browser Agent](https://docs.browserless.io/mcp/browser-agent)

## Agent-side adapter findings

The viable adapter is:

```text
Browser tool returns current URL
        |
        v
Agent calls Protocol Tooling MCP resolve_business({ url })
        |
        v
Resolver returns business identity, verification state,
capability names, and Protocol Tooling provenance
        |
        v
Agent calls Protocol Tooling MCP get_business_info(...)
```

This can be implemented today in:

- **A custom OpenAI API agent:** yes. The application supplies both browser/computer-use and MCP tools, and its orchestration instructions require the current URL to be passed explicitly.
- **A custom Chrome-based agent:** yes. The same agent can read its controlled tab URL and call an MCP server.
- **Other MCP browser agents:** yes, where the host exposes navigation/current-tab state and external MCP tools in one model context.
- **Stock ChatGPT Site Tools:** no. This adapter does not become a Site Tool, and no automatic current-page handoff to a connected app is documented.
- **Stock ChatGPT with an installed Protocol Tooling plugin:** potentially usable as ordinary MCP if the agent has the URL in conversation/browser context, but seamless automatic routing is unverified and should not be promised.

The key implementation requirement is to keep `url` explicit. A server should not claim “current page” when MCP gave it no cryptographically or platform-bound page context.

## Zero-install mechanisms investigated

| Mechanism | Finding |
|---|---|
| Provider-hosted browser/custom agent | Viable for zero local install; the provider can combine navigation and Protocol Tooling MCP. Agent-scoped, not WebMCP. |
| Browser proxy or rewritten mirror | Can inject code only into the proxy's representation. It changes the page/origin, may break authentication and integrity, and is not the original page. |
| DNS/TLS interception | Requires network/device trust configuration, creates severe security risk, and is not zero-install or a supported WebMCP mechanism. |
| Service worker | A worker is scoped to an origin it controls; Protocol Tooling cannot register one for Facebook, Instagram, Google, Shopify, or another business domain. |
| Bookmarklet | Requires user action and injects page code. It is neither ambient nor zero-install. |
| PWA/browser helper/native helper | Cannot access arbitrary third-party tabs without privileged integration; installation remains required. |
| Browser-native provider registry | Desired mechanism, but no current WebMCP or Chrome API was found. |
| ChatGPT plugin/app | Ordinary MCP with explicit provider identity; requires connection/installation and has no documented active-page binding. |
| MCP client configuration | Works for custom/Codex-style agents, but is user/developer setup and remains agent-scoped. |
| Remote browser automation | Viable composition in a hosted/custom agent; does not create page-scoped tools. |
| DevTools/automation injection | Technically can execute registration code, but modifies the live document through privileged automation and misattributes provenance. Not a supported ambient provider layer. |
| Search/index-time enrichment | Can help an agent find business facts, but does not provide a live capability registry or authoritative current-page binding. |
| Agent memory augmentation | May associate a URL with data, but is stale, non-authoritative, and not a tool-distribution or consent mechanism. |
| Enterprise browser policy | Can manage/force-install extensions; no external WebMCP-provider policy was found. It does not satisfy the no-extension constraint. |

### Architecture comparison

| Architecture | User install | Business integration | Page-scoped | Explicit provenance | Works today | WebMCP Challenge eligible |
|---|---:|---:|---:|---:|---:|---:|
| Native site WebMCP | No | Yes, page code | Yes | Yes, site origin | Yes | Yes |
| Protocol Tooling Chrome extension | Yes | No page change | Yes | No, provider is obscured by page origin | Mechanically yes; agent acceptance incomplete | Risky/weak |
| External MCP server | Connection/configuration | No page change; business registry still needed | No | Yes | Yes | No, not by itself |
| Agent-side URL resolver | No local install in a bundled/hosted agent | No page change; business registry still needed | No | Yes | Yes in custom agents | No, not by itself |
| Browser-native external provider | No | No page change | Would be | Could be | No supported mechanism found | No current path |
| Hosted/proxied page | No | No original-page change | Only to the hosted copy | Yes if labeled | Yes | Only if it implements native WebMCP |
| Hosted native WebMCP business surface | No | Protocol Tooling onboarding, no SMB site code | Yes, on Protocol Tooling's page | Yes, Protocol Tooling origin | Yes | Yes |
| Remote browser automation plus MCP | No local install when hosted | No page change; business registry still needed | No | Yes | Yes | No, not by itself |

“Business integration” distinguishes technical page work from business onboarding. Even a read-only resolver needs an authoritative record and mapping; zero page code does not mean zero business participation.

## Experimental evidence

The proof is isolated under [`experiments/ambient-zero-install-mcp`](../experiments/ambient-zero-install-mcp/README.md).

It uses the current MCP SDK in the repository dependency tree and exposes exactly two read-only external tools:

- `resolve_business({ url })`
- `get_business_info({ business_id, source_url })`

Observed sequence:

1. ChatGPT's in-app browser opened the unchanged Maria fixture.
2. Its page-bound WebMCP surface reported no tools.
3. The agent observed `http://127.0.0.1:4173/legacy/ordinary` through browser control.
4. The URL was explicitly supplied to the MCP client probe.
5. `resolve_business` returned the mock Maria record and advertised `get_business_info`.
6. `get_business_info` returned structured mock data.
7. Both results identified Protocol Tooling as capability author, retained the associated page URL, set `page_owner_authored_capability: false`, and labeled identity verification `mock_fixture_only`.
8. A negative control using `https://example.com/` did not resolve.

Concise captured output is in [`results/agent-side-mcp.json`](../experiments/ambient-zero-install-mcp/results/agent-side-mcp.json).

This proves the protocol and orchestration seam, not autonomous model selection. The model did not independently decide to call the local MCP server; an MCP SDK client made the repeatable calls after the agent observed the URL. It also does not prove an automatic ChatGPT browser-context handoff.

## Trust and provenance

For the viable agent-side architecture:

1. **Who authored the capability?** Protocol Tooling.
2. **Who controls it?** Protocol Tooling operates the MCP server and business registry; the agent host decides whether to expose it.
3. **What origin is shown?** The MCP server/provider identity should be shown separately from the associated page URL. The proof uses `mcp://protocol-tooling-ambient-resolver` only as an explicit mock provider identifier, not as a web security origin.
4. **Can the agent distinguish Facebook, Maria, and Protocol Tooling?** Yes, if outputs preserve three fields: observed page/platform URL, resolved business identity, and capability provider identity. The page must never be described as the capability author.
5. **How is Maria verified?** She is not verified in the proof. Production would require an opt-in claim process tied to authoritative evidence such as a controlled domain, platform account, or verified business record, with auditable mapping changes.
6. **How are transactions authorized?** Not solved here. A later design would need business authorization, user confirmation at action time, narrow scopes, idempotency, and an audit trail. This spike remains read-only.
7. **Could a malicious party attach fake capabilities?** Yes. A URL string alone is not authority. Domain transfers, social handle changes, redirects, multi-tenant paths, and forged registry submissions all make unaudited mappings unsafe.
8. **Must the business opt in?** For a trusted product, yes. Read-only public facts could be indexed without technical integration, but presenting business-specific operational capabilities or verified identity without consent is not acceptable. Lack of an opt-out is not consent.

The agent-side design is stronger than extension injection on provenance because the MCP server remains visibly Protocol Tooling-owned. It is weaker than native site WebMCP on page binding because the browser does not attest that the URL argument is the current document or that the business controls that page.

## Distribution implications

- A **ChatGPT plugin/MCP app** can distribute Protocol Tooling tools with clear provider provenance, but users must connect it and current-page awareness remains an agent prompt/orchestration concern.
- A **custom hosted agent** can offer the lowest-friction ambient experience: no local extension, preconfigured resolver, and a provider-controlled browser session. The tradeoff is that users are using Protocol Tooling's agent experience rather than gaining ambient capabilities inside arbitrary stock browsers.
- A **Chrome-based custom agent** can perform the same composition locally, but installing/configuring that agent is still distribution friction even if no page-injection extension is used.
- A **browser vendor integration** would be the true future solution: a provider registry with URL matching, signed provider identity, user controls, page-owner policy/consent, and tool calls clearly labeled as externally supplied. Current WebMCP does not define it.
- An **SMB-facing registry** is still required for reliable business identity. That is business onboarding, not website implementation, and should not be hidden in “zero integration” claims.

## Challenge implications

The agent-side MCP adapter is a valid architectural direction for the product thesis, but it is not a strong Challenge submission by itself because it does not use page-native WebMCP.

The extension approach uses `document.modelContext`, but it has three Challenge weaknesses: user installation, incomplete same-browser LLM acceptance, and misleading page-origin provenance.

The current repository already contains a stronger Challenge-compatible surface: Protocol Tooling-hosted business pages register native WebMCP tools in ChatGPT's in-app browser. A hosted business page is not ambient on Facebook or Google, but it offers:

- no user extension;
- no SMB website code;
- a live page-bound WebMCP tool surface;
- clear Protocol Tooling origin/provenance;
- a strong, repeatable ChatGPT demo;
- direct alignment with Challenge judging.

## Conclusion

**B. ZERO-INSTALL AMBIENT EXPERIENCE IS VIABLE, BUT NOT AS WEBMCP**

An agent that controls or observes a browser can explicitly pass the current URL to a Protocol Tooling MCP resolver and invoke read-only business capabilities with clear Protocol Tooling provenance. This works today in custom or hosted agent architectures and does not require a Protocol Tooling browser extension or changes to the third-party page.

It is not native or ambient WebMCP. The capability is agent-scoped, the URL is an ordinary argument rather than browser-attested page context, and stock ChatGPT documentation does not expose a supported automatic current-page-to-MCP bridge. Current WebMCP and Chrome expose no browser-global external provider registry for arbitrary pages.

The clean answer to the original question is:

> Protocol Tooling can provide an ambient-like, business-specific agent experience over an unmodified web presence today only when the agent platform explicitly composes browser context with a Protocol Tooling MCP resolver. It cannot attach those capabilities as zero-install Site Tools/WebMCP on the original third-party page with current supported APIs.

## Recommended challenge architecture

**3. Hosted native WebMCP surface**

Use the existing Protocol Tooling-hosted business page as the single Challenge architecture. Keep native `document.modelContext` registration on a Protocol Tooling origin and demonstrate read-only business discovery plus the existing bounded scheduling tool suite there.

This choice best optimizes the required criteria:

- **OpenAI WebMCP Challenge eligibility:** direct, native Site Tools usage in the supported ChatGPT in-app browser.
- **Strength of demo:** repeatable tool discovery and invocation on a controlled live page, without relying on extension installation or undocumented platform behavior.
- **Zero or minimal SMB technical work:** Protocol Tooling hosts the surface; an SMB need not modify Facebook, Google, Shopify, or its own site.
- **Minimal user friction:** open the Protocol Tooling business page; install nothing.
- **Clear provenance:** the browser origin and capability author are both Protocol Tooling, while the page explicitly presents the represented business.
- **Challenge-time feasibility:** the native hosted surface already exists in this repository and has prior ChatGPT discovery/invocation evidence; the challenge work can focus on presentation and reliability rather than a nonexistent browser provider API.

Do not present the hosted page as proof of ambient capabilities on Facebook or Google. Treat the external MCP resolver as post-Challenge product research, not as the Challenge's WebMCP mechanism.
