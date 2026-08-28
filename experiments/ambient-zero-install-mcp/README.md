# Zero-install agent-side MCP proof

This isolated experiment proves the closest viable zero-extension architecture: an agent explicitly passes its observed page URL to a Protocol Tooling MCP resolver, then calls a read-only business capability through ordinary MCP.

It is **not WebMCP**. The tools are agent-scoped and their provider is explicitly Protocol Tooling. They do not appear in the page's Site Tools list and do not inherit the page origin.

## Run

Start the unchanged legacy-business fixture from the extension spike:

```bash
node experiments/ambient-webmcp-bridge/server.mjs
```

In a second terminal, run the MCP client probe:

```bash
node experiments/ambient-zero-install-mcp/probe.mjs
```

The probe uses the MCP SDK already present in the repository dependency tree to:

1. Connect to the Protocol Tooling stdio MCP server.
2. List `resolve_business` and `get_business_info`.
3. Pass `http://127.0.0.1:4173/legacy/ordinary` explicitly to `resolve_business`.
4. Call `get_business_info` with the returned mock identity.
5. Print structured evidence with explicit provenance.

The fixture contains no JavaScript or WebMCP registration. A live ChatGPT in-app-browser check separately confirmed that the page itself exposes no Site Tools. The browser and MCP tool are separate agent capabilities; there is no automatic browser-to-MCP page-context channel in this proof.

## What this proves

- A custom agent or an agent configured with both browser control and this MCP server can compose the desired read-only flow without a browser extension.
- The URL must be observed by the agent/browser tool and passed as a normal MCP argument.
- Provenance can distinguish the viewed page, the mock business identity, and Protocol Tooling as capability author.

## What this does not prove

- ChatGPT automatically passes its current browser URL to connected MCP servers.
- The MCP tool is page-scoped or appears as a Site Tool.
- The mock business identity is verified or opted in.
- The architecture qualifies as WebMCP for the OpenAI WebMCP Challenge.

