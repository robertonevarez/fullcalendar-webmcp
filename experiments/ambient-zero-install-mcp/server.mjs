#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';

const PROVIDER = {
  id: 'protocol-tooling',
  name: 'Protocol Tooling',
  origin: 'mcp://protocol-tooling-ambient-resolver',
};

const TEST_BUSINESS = {
  business_id: 'marias-deep-cleaning',
  name: "Maria's Deep Cleaning",
  description: 'Residential deep-cleaning service used only by this feasibility spike.',
  phone: '+1-555-0100',
  service_area: 'Test City',
  source_url: 'http://127.0.0.1:4173/legacy/ordinary',
  verification: {
    status: 'mock_fixture_only',
    method: 'exact_url_allowlist',
    business_opt_in: false,
  },
};

function normalizeUrl(value) {
  const url = new URL(value);
  url.hash = '';
  url.search = '';
  url.pathname = url.pathname.replace(/\/$/, '') || '/';
  return url.toString().replace(/\/$/, '');
}

function provenance(sourceUrl) {
  return {
    capability_author: PROVIDER.name,
    capability_provider_id: PROVIDER.id,
    capability_provider_origin: PROVIDER.origin,
    associated_page_url: sourceUrl,
    page_owner_authored_capability: false,
    business_identity_status: TEST_BUSINESS.verification.status,
  };
}

const server = new McpServer({
  name: 'protocol-tooling-ambient-resolver',
  title: 'Protocol Tooling Ambient Resolver',
  version: '0.1.0',
});

server.registerTool(
  'resolve_business',
  {
    title: 'Resolve business from page URL',
    description:
      'Protocol Tooling read-only resolver. Given a URL explicitly supplied by the agent, return an associated business and capabilities. This is an external MCP tool, not a tool authored by the webpage.',
    inputSchema: {
      url: z.url().describe('The current page URL observed and explicitly passed by the agent.'),
    },
    outputSchema: {
      matched: z.boolean(),
      business: z
        .object({
          business_id: z.string(),
          name: z.string(),
          verified: z.boolean(),
          verification_status: z.string(),
        })
        .nullable(),
      capabilities: z.array(z.string()),
      provenance: z.object({
        capability_author: z.string(),
        capability_provider_id: z.string(),
        capability_provider_origin: z.string(),
        associated_page_url: z.string(),
        page_owner_authored_capability: z.boolean(),
        business_identity_status: z.string(),
      }),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ url }) => {
    const normalized = normalizeUrl(url);
    const matched = normalized === TEST_BUSINESS.source_url;
    const structuredContent = {
      matched,
      business: matched
        ? {
            business_id: TEST_BUSINESS.business_id,
            name: TEST_BUSINESS.name,
            verified: false,
            verification_status: TEST_BUSINESS.verification.status,
          }
        : null,
      capabilities: matched ? ['get_business_info'] : [],
      provenance: provenance(normalized),
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
      structuredContent,
    };
  },
);

server.registerTool(
  'get_business_info',
  {
    title: 'Get Protocol Tooling business information',
    description:
      'Return read-only mock business data supplied by Protocol Tooling for an explicitly resolved business/page association. The result is not Facebook, Google, or webpage-owner data.',
    inputSchema: {
      business_id: z.string().describe('Business identifier returned by resolve_business.'),
      source_url: z.url().describe('Page URL used for the resolution.'),
    },
    outputSchema: {
      business: z.object({
        business_id: z.string(),
        name: z.string(),
        description: z.string(),
        phone: z.string(),
        service_area: z.string(),
      }),
      provenance: z.object({
        capability_author: z.string(),
        capability_provider_id: z.string(),
        capability_provider_origin: z.string(),
        associated_page_url: z.string(),
        page_owner_authored_capability: z.boolean(),
        business_identity_status: z.string(),
      }),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ business_id, source_url }) => {
    const normalized = normalizeUrl(source_url);
    if (business_id !== TEST_BUSINESS.business_id || normalized !== TEST_BUSINESS.source_url) {
      return {
        content: [
          {
            type: 'text',
            text: 'No Protocol Tooling business matches that business_id and source_url pair.',
          },
        ],
        isError: true,
      };
    }

    const structuredContent = {
      business: {
        business_id: TEST_BUSINESS.business_id,
        name: TEST_BUSINESS.name,
        description: TEST_BUSINESS.description,
        phone: TEST_BUSINESS.phone,
        service_area: TEST_BUSINESS.service_area,
      },
      provenance: provenance(normalized),
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
      structuredContent,
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);

