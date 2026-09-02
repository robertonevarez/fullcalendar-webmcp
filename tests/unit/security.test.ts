import { describe, expect, it, vi } from "vitest";
import type { CalendarEventRepository, FullCalendarWebMCPCapabilities } from "../../src";
import {
  createCalendarTools,
  resolveCapabilities,
} from "../../src/tool-definitions";
import { FakeModelContext } from "../fake-model-context";

const ALL_TOOL_NAMES = [
  "calendar_get_context",
  "calendar_list_events",
  "calendar_get_event",
  "calendar_create_event",
  "calendar_update_event",
  "calendar_delete_event",
] as const;

function fakeCalendarRef() {
  return {
    current: {
      getApi: () => ({
        getOption: () => "local",
        view: {
          type: "timeGridWeek",
          activeStart: new Date("2026-08-30T06:00:00.000Z"),
          activeEnd: new Date("2026-09-06T06:00:00.000Z"),
        },
      }),
    },
  } as never;
}

function toolsFor(capabilities?: FullCalendarWebMCPCapabilities) {
  const events = {} as CalendarEventRepository;
  return createCalendarTools(() => ({
    calendarRef: fakeCalendarRef(),
    events,
    onEventsChanged: vi.fn(),
    capabilities,
  }));
}

function toolNames(capabilities?: FullCalendarWebMCPCapabilities) {
  return toolsFor(capabilities).map((tool) => tool.name);
}

describe("WebMCP security hardening", () => {
  describe("capability registration", () => {
    it("registers all six tools by default", () => {
      expect(toolNames().sort()).toEqual([...ALL_TOOL_NAMES].sort());
    });

    it("resolveCapabilities defaults every flag to true", () => {
      expect(resolveCapabilities()).toEqual({
        read: true,
        create: true,
        update: true,
        delete: true,
      });
      expect(resolveCapabilities({})).toEqual({
        read: true,
        create: true,
        update: true,
        delete: true,
      });
    });

    it("omits calendar_create_event when create is disabled", () => {
      const names = toolNames({ create: false });
      expect(names).not.toContain("calendar_create_event");
      expect(names).toHaveLength(5);
    });

    it("omits calendar_update_event when update is disabled", () => {
      const names = toolNames({ update: false });
      expect(names).not.toContain("calendar_update_event");
      expect(names).toHaveLength(5);
    });

    it("omits calendar_delete_event when delete is disabled", () => {
      const names = toolNames({ delete: false });
      expect(names).not.toContain("calendar_delete_event");
      expect(names).toHaveLength(5);
    });

    it("omits read tools but keeps calendar_get_context when read is disabled", () => {
      const names = toolNames({ read: false });
      expect(names).toContain("calendar_get_context");
      expect(names).not.toContain("calendar_list_events");
      expect(names).not.toContain("calendar_get_event");
      expect(names).toHaveLength(4);
    });

    it("registers only calendar_get_context when all event capabilities are disabled", () => {
      const names = toolNames({
        read: false,
        create: false,
        update: false,
        delete: false,
      });
      expect(names).toEqual(["calendar_get_context"]);
    });

    it("does not leave stale tools when capabilities shrink at registration time", async () => {
      let capabilities: FullCalendarWebMCPCapabilities = {
        read: true,
        create: true,
        update: true,
        delete: true,
      };
      const context = new FakeModelContext();
      const tools = createCalendarTools(() => ({
        calendarRef: fakeCalendarRef(),
        events: {} as CalendarEventRepository,
        onEventsChanged: vi.fn(),
        capabilities,
      }));
      await Promise.all(tools.map((tool) => context.registerTool(tool)));
      expect(context.tools.size).toBe(6);

      context.tools.clear();
      capabilities = { create: false, update: false, delete: false, read: false };
      const reduced = createCalendarTools(() => ({
        calendarRef: fakeCalendarRef(),
        events: {} as CalendarEventRepository,
        onEventsChanged: vi.fn(),
        capabilities,
      }));
      await Promise.all(reduced.map((tool) => context.registerTool(tool)));
      expect([...context.tools.keys()].sort()).toEqual(["calendar_get_context"]);
    });
  });

  describe("annotation contracts", () => {
    it("assigns per-tool WebMCP trust annotations", () => {
      const byName = Object.fromEntries(
        toolsFor().map((tool) => [tool.name, tool.annotations]),
      );

      expect(byName.calendar_get_context).toEqual({ readOnlyHint: true });
      expect(byName.calendar_list_events).toEqual({
        readOnlyHint: true,
        untrustedContentHint: true,
      });
      expect(byName.calendar_get_event).toEqual({
        readOnlyHint: true,
        untrustedContentHint: true,
      });
      expect(byName.calendar_create_event).toEqual({
        readOnlyHint: false,
        untrustedContentHint: true,
      });
      expect(byName.calendar_update_event).toEqual({
        readOnlyHint: false,
        untrustedContentHint: true,
      });
      expect(byName.calendar_delete_event).toEqual({
        readOnlyHint: false,
        untrustedContentHint: true,
      });
    });
  });

  describe("authorization and error propagation", () => {
    it("propagates repository authorization failures without calling onEventsChanged", async () => {
      const onEventsChanged = vi.fn();
      const authError = new Error("Forbidden: insufficient permissions");
      const blockedEvent = {
        id: "x",
        title: "Blocked",
        start: "2026-09-02T20:00:00.000Z",
        end: null,
        allDay: false,
      };
      const repository: CalendarEventRepository = {
        list: vi.fn(),
        get: vi.fn().mockResolvedValue(blockedEvent),
        create: vi.fn().mockRejectedValue(authError),
        update: vi.fn().mockRejectedValue(authError),
        delete: vi.fn().mockRejectedValue(authError),
      };
      const tools = createCalendarTools(() => ({
        calendarRef: fakeCalendarRef(),
        events: repository,
        onEventsChanged,
      }));
      const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
      const signal = new AbortController().signal;

      await expect(
        byName.calendar_create_event!.execute(
          { title: "Blocked", start: "2026-09-02T14:00:00-06:00" },
          { signal },
        ),
      ).rejects.toThrow("Forbidden: insufficient permissions");

      await expect(
        byName.calendar_update_event!.execute(
          { id: "x", title: "Blocked" },
          { signal },
        ),
      ).rejects.toThrow("Forbidden: insufficient permissions");

      await expect(
        byName.calendar_delete_event!.execute({ id: "x" }, { signal }),
      ).rejects.toThrow("Forbidden: insufficient permissions");

      expect(onEventsChanged).not.toHaveBeenCalled();
    });

    it("propagates read authorization failures from the repository", async () => {
      const listError = new Error("Forbidden: tenant mismatch");
      const repository: CalendarEventRepository = {
        list: vi.fn().mockRejectedValue(listError),
        get: vi.fn().mockRejectedValue(new Error("Forbidden: event not accessible")),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
      const tools = createCalendarTools(() => ({
        calendarRef: fakeCalendarRef(),
        events: repository,
        onEventsChanged: vi.fn(),
      }));
      const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
      const signal = new AbortController().signal;

      await expect(byName.calendar_list_events!.execute({}, { signal })).rejects.toThrow(
        "Forbidden: tenant mismatch",
      );
      await expect(
        byName.calendar_get_event!.execute({ id: "secret" }, { signal }),
      ).rejects.toThrow("Forbidden: event not accessible");
    });
  });
});
