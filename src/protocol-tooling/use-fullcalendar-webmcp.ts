import { useEffect, useRef } from "react";
import { registerCalendarToolsWhenAvailable } from "./register-tools";
import type { FullCalendarWebMCPOptions } from "./tool-definitions";

export function useFullCalendarWebMCP(options: FullCalendarWebMCPOptions) {
  const latestOptions = useRef(options);
  latestOptions.current = options;

  useEffect(() => {
    const lifecycle = new AbortController();
    registerCalendarToolsWhenAvailable(
      () => latestOptions.current,
      lifecycle.signal,
    );
    return () => lifecycle.abort();
  }, []);
}
