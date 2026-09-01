import { describe, expect, it, vi } from "vitest";
import type { CalendarEvent, CalendarEventRepository } from "../../src";
import { LocalCalendarEventRepository } from "../../example/calendar/local-calendar-repository";
import { createCalendarTools } from "../../src/tool-definitions";
import { FakeModelContext } from "../fake-model-context";
import { MapStorage } from "../map-storage";

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

function createHarness(overrides?: {
  events?: CalendarEventRepository;
  onEventsChanged?: () => unknown;
}) {
  const onEventsChanged = overrides?.onEventsChanged ?? vi.fn();
  const tools = createCalendarTools(() => ({
    calendarRef: fakeCalendarRef(),
    events: overrides?.events ?? ({} as CalendarEventRepository),
    onEventsChanged,
  }));
  return {
    onEventsChanged,
    deleteTool: tools.find((tool) => tool.name === "calendar_delete_event")!,
    createTool: tools.find((tool) => tool.name === "calendar_create_event")!,
    updateTool: tools.find((tool) => tool.name === "calendar_update_event")!,
  };
}

const executeOptions = { signal: new AbortController().signal };

describe("WebMCP result semantics", () => {
  describe("calendar_delete_event", () => {
    it("returns a snapshot of the deleted event with core fields and metadata", async () => {
      const storage = new MapStorage();
      const repository = new LocalCalendarEventRepository({
        storage,
        createId: () => "delete-snapshot",
      });
      await repository.create({
        title: "Sarah Meeting",
        start: "2026-09-02T14:00:00-06:00",
        end: "2026-09-02T15:00:00-06:00",
      });
      await repository.update("delete-snapshot", { title: "Sarah Meeting" });
      const withMeta = await repository.get("delete-snapshot");
      expect(withMeta).toBeTruthy();

      const { deleteTool, onEventsChanged } = createHarness({
        events: repository,
      });
      const result = (await deleteTool.execute(
        { id: "delete-snapshot" },
        executeOptions,
      )) as { deleted: boolean; event: CalendarEvent };

      expect(result.deleted).toBe(true);
      expect(result.event.id).toBe("delete-snapshot");
      expect(result.event.title).toBe("Sarah Meeting");
      expect(result.event.start).toBe("2026-09-02T20:00:00.000Z");
      expect(result.event.end).toBe("2026-09-02T21:00:00.000Z");
      expect(result.event.allDay).toBe(false);
      expect(await repository.get("delete-snapshot")).toBeNull();
      expect(onEventsChanged).toHaveBeenCalledOnce();
    });

    it("preserves host-selected metadata in the deleted snapshot", async () => {
      const repository: CalendarEventRepository = {
        async list() {
          return [];
        },
        async get(id) {
          if (id !== "meta-event") return null;
          return {
            id: "meta-event",
            title: "Sarah Meeting",
            start: "2026-09-02T20:00:00.000Z",
            end: "2026-09-02T21:00:00.000Z",
            allDay: false,
            metadata: { location: "Room 4", attendees: ["Sarah"] },
          };
        },
        async create() {
          throw new Error("unused");
        },
        async update() {
          throw new Error("unused");
        },
        async delete(id) {
          if (id !== "meta-event") throw new Error("missing");
        },
      };

      const { deleteTool } = createHarness({ events: repository });
      const result = (await deleteTool.execute(
        { id: "meta-event" },
        executeOptions,
      )) as { deleted: boolean; event: CalendarEvent };

      expect(result.event.metadata).toEqual({
        location: "Room 4",
        attendees: ["Sarah"],
      });
    });

    it("rejects delete when the event is not found and does not call onEventsChanged", async () => {
      const deleteFn = vi.fn();
      const getFn = vi.fn().mockResolvedValue(null);
      const repository: CalendarEventRepository = {
        list: vi.fn(),
        get: getFn,
        create: vi.fn(),
        update: vi.fn(),
        delete: deleteFn,
      };
      const onEventsChanged = vi.fn();
      const { deleteTool } = createHarness({ events: repository, onEventsChanged });

      await expect(
        deleteTool.execute({ id: "missing-event" }, executeOptions),
      ).rejects.toThrow("Event missing-event was not found.");

      expect(getFn).toHaveBeenCalledWith("missing-event", executeOptions);
      expect(deleteFn).not.toHaveBeenCalled();
      expect(onEventsChanged).not.toHaveBeenCalled();
    });

    it("propagates delete failures without returning success or refreshing UI", async () => {
      const existing: CalendarEvent = {
        id: "blocked",
        title: "Sarah Meeting",
        start: "2026-09-02T20:00:00.000Z",
        end: "2026-09-02T21:00:00.000Z",
        allDay: false,
      };
      const repository: CalendarEventRepository = {
        list: vi.fn(),
        get: vi.fn().mockResolvedValue(existing),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn().mockRejectedValue(new Error("Forbidden")),
      };
      const onEventsChanged = vi.fn();
      const { deleteTool } = createHarness({ events: repository, onEventsChanged });

      await expect(
        deleteTool.execute({ id: "blocked" }, executeOptions),
      ).rejects.toThrow("Forbidden");

      expect(onEventsChanged).not.toHaveBeenCalled();
    });
  });

  describe("calendar_create_event and calendar_update_event", () => {
    it("returns repository-authoritative post-create state rather than echoing raw input", async () => {
      const storage = new MapStorage();
      const repository = new LocalCalendarEventRepository({
        storage,
        createId: () => "created-id",
      });
      const { createTool } = createHarness({ events: repository });

      const result = (await createTool.execute(
        {
          title: "  Lunch with Sarah  ",
          start: "2026-09-02T12:00:00-06:00",
          end: "2026-09-02T13:00:00-06:00",
        },
        executeOptions,
      )) as { event: CalendarEvent };

      expect(result.event.id).toBe("created-id");
      expect(result.event.title).toBe("Lunch with Sarah");
      expect(result.event.start).toBe("2026-09-02T18:00:00.000Z");
      expect(result.event.end).toBe("2026-09-02T19:00:00.000Z");
    });

    it("returns repository-authoritative post-update state with unchanged fields preserved", async () => {
      const storage = new MapStorage();
      const repository = new LocalCalendarEventRepository({
        storage,
        createId: () => "update-id",
      });
      await repository.create({
        title: "Dentist",
        start: "2026-09-02T14:00:00-06:00",
        end: "2026-09-02T15:00:00-06:00",
        allDay: false,
      });

      const { updateTool } = createHarness({ events: repository });
      const result = (await updateTool.execute(
        {
          id: "update-id",
          start: "2026-09-02T16:00:00-06:00",
          end: "2026-09-02T17:00:00-06:00",
        },
        executeOptions,
      )) as { event: CalendarEvent };

      expect(result.event.title).toBe("Dentist");
      expect(result.event.start).toBe("2026-09-02T22:00:00.000Z");
      expect(result.event.end).toBe("2026-09-02T23:00:00.000Z");
    });
  });

  describe("read tools", () => {
    it("returns null for missing get-by-id without manufacturing an error object", async () => {
      const context = new FakeModelContext();
      const tools = createCalendarTools(() => ({
        calendarRef: fakeCalendarRef(),
        events: {
          list: async () => [],
          get: async () => null,
          create: async () => {
            throw new Error("unused");
          },
          update: async () => {
            throw new Error("unused");
          },
          delete: async () => {},
        },
        onEventsChanged: vi.fn(),
      }));
      await context.registerTool(
        tools.find((tool) => tool.name === "calendar_get_event")!,
      );

      await expect(
        context.executeTool("calendar_get_event", { id: "missing" }),
      ).resolves.toEqual({ event: null });
    });

    it("returns an empty events array for no matches without agent-reasoning flags", async () => {
      const context = new FakeModelContext();
      const tools = createCalendarTools(() => ({
        calendarRef: fakeCalendarRef(),
        events: {
          list: async () => [],
          get: async () => null,
          create: async () => {
            throw new Error("unused");
          },
          update: async () => {
            throw new Error("unused");
          },
          delete: async () => {},
        },
        onEventsChanged: vi.fn(),
      }));
      await context.registerTool(
        tools.find((tool) => tool.name === "calendar_list_events")!,
      );

      const result = (await context.executeTool("calendar_list_events", {
        text: "dentist",
      })) as { events: CalendarEvent[] };

      expect(result).toEqual({ events: [] });
      expect(result).not.toHaveProperty("ambiguous");
      expect(result).not.toHaveProperty("message");
    });
  });
});
