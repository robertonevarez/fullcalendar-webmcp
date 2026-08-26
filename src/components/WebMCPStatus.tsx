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
    <section className="status-panel" aria-labelledby="webmcp-status-heading">
      <h2 id="webmcp-status-heading">WebMCP status</h2>
      <p>
        <strong>Business context:</strong> {businessName} (<code>{businessSlug}</code>)
      </p>
      <p>
        <strong>Registration:</strong>{' '}
        {status === 'checking' && 'Checking browser support…'}
        {status === 'registered' && (
          <span className="status-ok">Tools registered on this page.</span>
        )}
        {status === 'unsupported' && (
          <span className="status-warn">
            WebMCP API not available here. Use ChatGPT&apos;s in-app browser or Chrome with{' '}
            <code>chrome://flags/#enable-webmcp-testing</code>.
          </span>
        )}
      </p>
      {status === 'registered' && (
        <>
          <p>
            <strong>Registered tools ({tools.length}):</strong>
          </p>
          <ul className="tool-list">
            {tools.map((tool) => (
              <li key={tool}>
                <code>{tool}</code>
              </li>
            ))}
          </ul>
        </>
      )}
      <p style={{ marginTop: '1rem' }}>
        Expected tools: {WEBMCP_TOOL_NAMES.map((name) => (
          <code key={name} style={{ marginRight: '0.45rem' }}>
            {name}
          </code>
        ))}
      </p>
    </section>
  );
}
