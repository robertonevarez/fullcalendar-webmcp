// @vitest-environment node

import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { FullCalendarWebMCPOptions } from "./tool-definitions";
import { useFullCalendarWebMCP } from "./use-fullcalendar-webmcp";

const options = {
  calendarRef: { current: null },
  events: {},
  onEventsChanged: vi.fn(),
} as unknown as FullCalendarWebMCPOptions;

function ServerRenderedCalendarIntegration() {
  useFullCalendarWebMCP(options);
  return <div>Calendar</div>;
}

describe("useFullCalendarWebMCP SSR compatibility", () => {
  it("does not access browser globals during a server render", () => {
    expect(() => renderToString(<ServerRenderedCalendarIntegration />)).not.toThrow();
  });
});
