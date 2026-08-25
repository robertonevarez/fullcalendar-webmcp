'use client';

import { useEffect, useState } from 'react';
import { registerBusinessTools, WEBMCP_TOOL_NAMES } from '@/webmcp/tools';

interface WebMCPStatusProps {
  businessSlug: string;
  businessName: string;
}

export function WebMCPStatus({ businessSlug, businessName }: WebMCPStatusProps) {
  const [status, setStatus] = useState<'checking' | 'registered' | 'unsupported'>('checking');
  const [tools, setTools] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    registerBusinessTools(businessSlug, businessName, controller.signal)
      .then((result) => {
        if (!active) return;
        if (result.supported) {
          setStatus('registered');
          setTools(result.registered);
        } else {
          setStatus('unsupported');
        }
      })
      .catch(() => {
        if (active) setStatus('unsupported');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [businessSlug, businessName]);

  return (
    <section style={{ marginTop: '1.5rem', padding: '1rem', border: '1px solid #ddd', borderRadius: 8 }}>
      <h2>WebMCP status</h2>
      <p>
        <strong>Business context:</strong> {businessName} ({businessSlug})
      </p>
      <p>
        <strong>Registration:</strong>{' '}
        {status === 'checking' && 'Checking browser support...'}
        {status === 'registered' && 'Tools registered on this page.'}
        {status === 'unsupported' && 'WebMCP API not available in this browser. Use ChatGPT in-app browser or Chrome with WebMCP testing enabled.'}
      </p>
      {status === 'registered' && (
        <>
          <p>
            <strong>Tools ({tools.length}):</strong>
          </p>
          <ul>
            {tools.map((tool) => (
              <li key={tool}>
                <code>{tool}</code>
              </li>
            ))}
          </ul>
        </>
      )}
      <p style={{ marginTop: '1rem' }}>
        Expected tools: {WEBMCP_TOOL_NAMES.join(', ')}
      </p>
      <p>
        Manual test: open this page in ChatGPT&apos;s in-app browser or Chrome with{' '}
        <code>chrome://flags/#enable-webmcp-testing</code>, then use the Model Context Tool Inspector.
      </p>
    </section>
  );
}
