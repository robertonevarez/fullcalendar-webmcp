'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { WebMCPRegistrar } from '@/components/webmcp-registrar';
import type { WebMCPRegistrationState } from '@/webmcp/lifecycle';

// Client Components render once on the server and again during hydration. Do
// not read document.modelContext here: it can be injected by the browser only,
// which would make the client render differ from the server HTML.
const INITIAL_REGISTRATION_STATE: WebMCPRegistrationState = {
  phase: 'waiting',
  supported: false,
  attempted: false,
};

const WebMCPRegistrationContext = createContext<WebMCPRegistrationState>(INITIAL_REGISTRATION_STATE);

export function useWebMCPRegistrationState(): WebMCPRegistrationState {
  return useContext(WebMCPRegistrationContext);
}

export interface WebMCPBusinessProviderProps {
  businessSlug: string;
  businessName: string;
  apiBaseUrl?: string;
  children: ReactNode;
}

export function WebMCPBusinessProvider({
  businessSlug,
  businessName,
  apiBaseUrl,
  children,
}: WebMCPBusinessProviderProps) {
  const [state, setState] = useState<WebMCPRegistrationState>(INITIAL_REGISTRATION_STATE);

  return (
    <WebMCPRegistrationContext.Provider value={state}>
      <WebMCPRegistrar
        businessSlug={businessSlug}
        businessName={businessName}
        apiBaseUrl={apiBaseUrl}
        onStateChange={setState}
      />
      {children}
    </WebMCPRegistrationContext.Provider>
  );
}
