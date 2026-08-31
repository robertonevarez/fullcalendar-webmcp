import { useEffect, useRef } from "react";
import { registerCalendarToolsWhenAvailable } from "./register-tools";
import type { FullCalendarWebMCPOptions } from "./types";

/**
 * Primary React hook integrating FullCalendar with the browser WebMCP model context.
 *
 * Provides safe client-side registration, unmount cleanup, and continuous
 * binding to host persistence callbacks without re-registering tools across renders.
 */
export function useFullCalendarWebMCP(options: FullCalendarWebMCPOptions): void {
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
