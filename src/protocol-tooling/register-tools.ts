import { createCalendarTools } from "./tool-definitions";
import type { FullCalendarWebMCPOptions } from "./tool-definitions";

const RUNTIME_POLL_INTERVAL_MS = 250;

export function registerCalendarToolsWhenAvailable(
  readOptions: () => FullCalendarWebMCPOptions,
  lifecycleSignal: AbortSignal,
) {
  let retryTimer: number | undefined;

  const register = async () => {
    if (lifecycleSignal.aborted) return;

    const modelContext = document.modelContext;
    if (!modelContext) {
      retryTimer = window.setTimeout(register, RUNTIME_POLL_INTERVAL_MS);
      return;
    }

    const registration = new AbortController();
    const unregister = () => registration.abort(lifecycleSignal.reason);
    lifecycleSignal.addEventListener("abort", unregister, { once: true });

    try {
      await Promise.all(
        createCalendarTools(readOptions).map((tool) =>
          modelContext.registerTool(tool, { signal: registration.signal }),
        ),
      );
    } catch (error) {
      registration.abort();
      if (!lifecycleSignal.aborted) {
        readOptions().onRegistrationError?.(error);
      }
    }
  };

  void register();

  lifecycleSignal.addEventListener(
    "abort",
    () => {
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    },
    { once: true },
  );
}
