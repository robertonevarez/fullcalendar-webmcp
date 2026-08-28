#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';

const sourceUrl = process.argv[2] || 'http://127.0.0.1:4173/legacy/ordinary';
const serverPath = fileURLToPath(new URL('./server.mjs', import.meta.url));

const client = new Client({
  name: 'protocol-tooling-zero-install-probe',
  version: '0.1.0',
});

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath],
  stderr: 'pipe',
});

await client.connect(transport);

try {
  const listed = await client.listTools();
  const resolution = await client.callTool({
    name: 'resolve_business',
    arguments: { url: sourceUrl },
  });

  if (!resolution.structuredContent?.matched) {
    throw new Error(`No test business matched ${sourceUrl}`);
  }

  const business = resolution.structuredContent.business;
  const info = await client.callTool({
    name: 'get_business_info',
    arguments: {
      business_id: business.business_id,
      source_url: sourceUrl,
    },
  });

  const evidence = {
    experiment: 'agent-side external MCP adapter',
    observed_page_url: sourceUrl,
    current_url_delivery: 'explicit_agent_argument',
    automatic_browser_context_delivery: false,
    page_scoped: false,
    webmcp: false,
    user_browser_extension: false,
    business_page_modified: false,
    mcp_server: {
      name: 'protocol-tooling-ambient-resolver',
      tools: listed.tools.map(({ name, title, description }) => ({ name, title, description })),
    },
    resolution: resolution.structuredContent,
    get_business_info: info.structuredContent,
  };

  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
} finally {
  await client.close();
}

