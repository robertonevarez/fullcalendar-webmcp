import { describe, expect, it, vi } from "vitest";
import type { CalendarEventRepository } from "../../src";
import { createCalendarTools } from "../../src/tool-definitions";

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

function toolsByName() {
  const tools = createCalendarTools(() => ({
    calendarRef: fakeCalendarRef(),
    events: {} as CalendarEventRepository,
    onEventsChanged: vi.fn(),
  }));
  return Object.fromEntries(tools.map((tool) => [tool.name, tool]));
}

function toolText(name: string): string {
  const tool = toolsByName()[name];
  expect(tool, name).toBeDefined();
  return tool!.description.toLowerCase();
}

function propertyDescription(
  name: string,
  property: string,
): string {
  const schema = toolsByName()[name]!.inputSchema as {
    properties?: Record<string, { description?: string }>;
  };
  const desc = schema.properties?.[property]?.description;
  expect(desc, `${name}.${property}`).toBeDefined();
  return desc!.toLowerCase();
}

function mentions(text: string, ...needles: string[]) {
  for (const needle of needles) {
    expect(text, `expected "${needle}"`).toContain(needle.toLowerCase());
  }
}

describe("agent-facing tool contract", () => {
  describe("tool titles", () => {
    it("uses consistent Get/List/Create/Update/Delete calendar phrasing", () => {
      const titles = Object.fromEntries(
        Object.values(toolsByName()).map((tool) => [tool.name, tool.title]),
      );
      expect(titles.calendar_get_context).toBe("Get calendar context");
      expect(titles.calendar_list_events).toBe("List calendar events");
      expect(titles.calendar_get_event).toBe("Get calendar event");
      expect(titles.calendar_create_event).toBe("Create calendar event");
      expect(titles.calendar_update_event).toBe("Update calendar event");
      expect(titles.calendar_delete_event).toBe("Delete calendar event");
    });
  });

  describe("calendar_get_context", () => {
    it("frames relative-date interpretation and distinguishes from event search", () => {
      const text = toolText("calendar_get_context");
      mentions(text, "relative", "calendar_list_events", "not persisted");
      mentions(text, "tomorrow", "today");
    });
  });

  describe("calendar_list_events", () => {
    it("identifies discovery/search and tool-selection boundaries", () => {
      const text = toolText("calendar_list_events");
      mentions(
        text,
        "discovery",
        "calendar_get_event",
        "calendar_get_context",
        "stable id",
        "ambiguous",
      );
    });

    it("documents query boundary semantics on start and end parameters", () => {
      mentions(propertyDescription("calendar_list_events", "start"), "inclusive", "filter");
      mentions(
        propertyDescription("calendar_list_events", "end"),
        "exclusive",
        "following day",
      );
    });
  });

  describe("calendar_get_event", () => {
    it("requires stable id and rejects title search", () => {
      const text = toolText("calendar_get_event");
      mentions(
        text,
        "stable id",
        "calendar_list_events",
        "do not invent",
        "title",
        "null",
      );
    });

    it("documents id as distinct from title on the id parameter", () => {
      const id = propertyDescription("calendar_get_event", "id");
      mentions(id, "stable id", "calendar_list_events", "never substitute", "title");
    });
  });

  describe("calendar_create_event", () => {
    it("communicates persistence, metadata limits, and create-vs-update boundary", () => {
      const text = toolText("calendar_create_event");
      mentions(
        text,
        "persist",
        "metadata cannot",
        "calendar_update_event",
        "calendar_get_context",
      );
    });
  });

  describe("calendar_update_event", () => {
    it("communicates partial update, stable id prerequisite, and list-first sequencing", () => {
      const text = toolText("calendar_update_event");
      mentions(
        text,
        "omitted",
        "unchanged",
        "stable id",
        "calendar_list_events",
        "metadata",
        "calendar_delete_event",
        "calendar_create_event",
      );
    });

    it("documents id as distinct from title on the id parameter", () => {
      const id = propertyDescription("calendar_update_event", "id");
      mentions(id, "stable id", "never substitute", "title");
    });
  });

  describe("calendar_delete_event", () => {
    it("communicates permanent deletion, id prerequisite, and list-first disambiguation", () => {
      const text = toolText("calendar_delete_event");
      mentions(
        text,
        "permanently",
        "stable id",
        "calendar_list_events",
        "ambiguous",
        "calendar_update_event",
        "title",
      );
    });
  });

  describe("mutation parameter semantics", () => {
    it("separates event start/end descriptions from query boundary descriptions", () => {
      const eventStart = propertyDescription("calendar_create_event", "start");
      const queryStart = propertyDescription("calendar_list_events", "start");
      expect(eventStart).toContain("event start");
      expect(queryStart).toContain("filter");
      expect(eventStart).not.toEqual(queryStart);

      const eventEnd = propertyDescription("calendar_create_event", "end");
      const queryEnd = propertyDescription("calendar_list_events", "end");
      expect(eventEnd).toContain("event end");
      expect(queryEnd).toContain("filter");
      expect(eventEnd).not.toEqual(queryEnd);
    });

    it("documents update fields as omit-to-leave-unchanged", () => {
      mentions(propertyDescription("calendar_update_event", "title"), "omit");
      mentions(propertyDescription("calendar_update_event", "start"), "omit");
      mentions(propertyDescription("calendar_update_event", "end"), "omit");
      mentions(propertyDescription("calendar_update_event", "allDay"), "omit");
    });
  });
});
