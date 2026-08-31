import { StrictMode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeModelContext, setModelContext } from "../test/fake-model-context";
import type { FullCalendarWebMCPOptions } from "./tool-definitions";
import { useFullCalendarWebMCP } from "./use-fullcalendar-webmcp";

const options = {
  calendarRef: { current: null },
  events: {},
  onEventsChanged: vi.fn(),
} as unknown as FullCalendarWebMCPOptions;

describe("useFullCalendarWebMCP", () => {
  beforeEach(() => setModelContext(undefined));
  afterEach(() => {
    setModelContext(undefined);
    vi.useRealTimers();
  });

  it("registers exactly one tool set under React Strict Mode and cleans it up", async () => {
    const context = new FakeModelContext();
    setModelContext(context);

    const { unmount } = renderHook(() => useFullCalendarWebMCP(options), {
      wrapper: StrictMode,
    });
    await waitFor(() => expect(context.tools).toHaveLength(6));

    unmount();
    expect(context.tools).toHaveLength(0);
  });

  it("waits for a WebMCP runtime injected after mount", async () => {
    vi.useFakeTimers();
    const context = new FakeModelContext();
    const { unmount } = renderHook(() => useFullCalendarWebMCP(options));

    expect(context.tools).toHaveLength(0);
    setModelContext(context);
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(context.tools).toHaveLength(6);

    unmount();
    expect(context.tools).toHaveLength(0);
  });

  it("reports duplicate registration without removing the existing tools", async () => {
    const context = new FakeModelContext();
    const existing = new AbortController();
    await context.registerTool(
      {
        name: "calendar_get_context",
        description: "existing",
        execute: async () => null,
      },
      { signal: existing.signal },
    );
    setModelContext(context);
    const onRegistrationError = vi.fn();

    renderHook(() =>
      useFullCalendarWebMCP({ ...options, onRegistrationError }),
    );
    await waitFor(() => expect(onRegistrationError).toHaveBeenCalledOnce());

    expect(context.tools).toHaveLength(1);
    expect(context.tools.get("calendar_get_context")?.description).toBe("existing");
    existing.abort();
  });
});
