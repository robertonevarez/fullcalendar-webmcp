import { describe, expect, expectTypeOf, it, vi } from "vitest";
import type {
  CalendarEvent,
  CalendarEventRepository,
  CreateCalendarEventInput,
  JsonObject,
  JsonValue,
  UpdateCalendarEventInput,
} from "../../src";
import { createCalendarTools } from "../../src/tool-definitions";

/**
 * P0.3 experiment: host-selected, JSON-safe, read-only metadata projection.
 * Metadata originates at the repository boundary — never FullCalendar Event Objects.
 */

type HostAppointment = {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  attendees: string[];
  tenantId: string;
  billingCode: string;
  privateNotes: string;
};

function appointmentToCalendarEvent(appointment: HostAppointment): CalendarEvent {
  return {
    id: appointment.id,
    title: appointment.title,
    start: appointment.start,
    end: appointment.end,
    allDay: false,
    metadata: {
      location: appointment.location,
      attendees: [...appointment.attendees],
    },
  };
}

function createProjectingRepository(
  appointments: Map<string, HostAppointment>,
): CalendarEventRepository {
  return {
    async list() {
      return [...appointments.values()].map(appointmentToCalendarEvent);
    },
    async get(id) {
      const appointment = appointments.get(id);
      return appointment ? appointmentToCalendarEvent(appointment) : null;
    },
    async create(input: CreateCalendarEventInput) {
      const id = "created-event";
      const appointment: HostAppointment = {
        id,
        title: input.title,
        start: input.start,
        end: input.end ?? input.start,
        location: "Unassigned",
        attendees: [],
        tenantId: "tenant-secret",
        billingCode: "internal-never-expose",
        privateNotes: "Created privately",
      };
      appointments.set(id, appointment);
      return appointmentToCalendarEvent(appointment);
    },
    async update(id, input: UpdateCalendarEventInput) {
      const current = appointments.get(id);
      if (!current) throw new Error(`Missing ${id}`);
      const next: HostAppointment = {
        ...current,
        title: input.title ?? current.title,
        start: input.start ?? current.start,
        end: input.end === undefined ? current.end : (input.end ?? current.end),
      };
      appointments.set(id, next);
      return appointmentToCalendarEvent(next);
    },
    async delete(id) {
      appointments.delete(id);
    },
  };
}

function fakeCalendarRef(getEvents = vi.fn(() => [])) {
  return {
    current: {
      getApi: () => ({
        getOption: () => "local",
        getEvents,
        getEventById: vi.fn(),
        view: {
          type: "timeGridWeek",
          activeStart: new Date("2026-09-14T06:00:00.000Z"),
          activeEnd: new Date("2026-09-21T06:00:00.000Z"),
        },
      }),
    },
  } as never;
}

function toolsFor(repository: CalendarEventRepository, getEvents = vi.fn(() => [])) {
  const onEventsChanged = vi.fn();
  const tools = createCalendarTools(() => ({
    calendarRef: fakeCalendarRef(getEvents),
    events: repository,
    onEventsChanged,
  }));
  return {
    onEventsChanged,
    getEvents,
    byName: Object.fromEntries(tools.map((tool) => [tool.name, tool])),
  };
}

const executeOptions = { signal: new AbortController().signal };

async function exec(
  tool: WebMCP.ModelContextTool,
  input: Record<string, unknown> = {},
) {
  return tool.execute(input, executeOptions);
}

const SEED_APPOINTMENT: HostAppointment = {
  id: "event-1",
  title: "Project Review",
  start: "2026-09-15T16:00:00.000Z",
  end: "2026-09-15T17:00:00.000Z",
  location: "North Campus",
  attendees: ["Sarah Chen", "Michael Torres"],
  tenantId: "tenant-secret",
  billingCode: "internal-9281",
  privateNotes: "Sensitive internal note",
};

describe("P0.3 read-only metadata projection", () => {
  describe("JSON-safe type contract", () => {
    it("accepts nested JSON-safe metadata on CalendarEvent", () => {
      const metadata: JsonObject = {
        location: "North Campus",
        attendees: ["Sarah Chen"],
        capacity: 12,
        confirmed: true,
        notes: null,
        nested: {
          building: 4,
        },
      };

      const event: CalendarEvent = {
        id: "typed",
        title: "Typed",
        start: "2026-09-15T16:00:00.000Z",
        end: null,
        allDay: false,
        metadata,
      };

      expectTypeOf(event.metadata).toEqualTypeOf<JsonObject | undefined>();
      expectTypeOf(metadata.nested).toMatchTypeOf<JsonValue>();
    });

    it("rejects non-JSON-safe metadata values at the type level", () => {
      expectTypeOf<JsonValue>().not.toMatchTypeOf<() => void>();
      expectTypeOf<JsonValue>().not.toMatchTypeOf<Date>();
      expectTypeOf<JsonValue>().not.toMatchTypeOf<Map<string, string>>();
      expectTypeOf<JsonValue>().not.toMatchTypeOf<Set<string>>();
      expectTypeOf<JsonValue>().not.toMatchTypeOf<bigint>();
      expectTypeOf<JsonValue>().not.toMatchTypeOf<undefined>();

      type AssertNeverMetadataKey<T> = "metadata" extends keyof T ? false : true;
      expectTypeOf<
        AssertNeverMetadataKey<CreateCalendarEventInput>
      >().toEqualTypeOf<true>();
      expectTypeOf<
        AssertNeverMetadataKey<UpdateCalendarEventInput>
      >().toEqualTypeOf<true>();
    });

    it("keeps create/update inputs free of metadata", () => {
      expectTypeOf<CreateCalendarEventInput>().not.toHaveProperty("metadata");
      expectTypeOf<UpdateCalendarEventInput>().not.toHaveProperty("metadata");
    });

    it("allows legacy five-field CalendarEvent without metadata", () => {
      const legacy: CalendarEvent = {
        id: "legacy",
        title: "Legacy",
        start: "2026-09-15T16:00:00.000Z",
        end: "2026-09-15T17:00:00.000Z",
        allDay: false,
      };
      expect(legacy.metadata).toBeUndefined();
      expectTypeOf(legacy).toMatchTypeOf<CalendarEvent>();
    });
  });

  describe("read tools", () => {
    it("returns metadata from list and get through the WebMCP tool path", async () => {
      const appointments = new Map([[SEED_APPOINTMENT.id, SEED_APPOINTMENT]]);
      const { byName, getEvents } = toolsFor(createProjectingRepository(appointments));

      const listed = (await exec(byName.calendar_list_events!)) as {
        events: CalendarEvent[];
      };
      expect(listed.events).toHaveLength(1);
      expect(listed.events[0]!.metadata).toEqual({
        location: "North Campus",
        attendees: ["Sarah Chen", "Michael Torres"],
      });

      const got = (await exec(byName.calendar_get_event!, {
        id: "event-1",
      })) as { event: CalendarEvent };
      expect(got.event.metadata).toEqual({
        location: "North Campus",
        attendees: ["Sarah Chen", "Michael Torres"],
      });

      // Architecture: reads must not scrape FullCalendar Event Objects.
      expect(getEvents).not.toHaveBeenCalled();
    });

    it("omits metadata when the repository does not project it", async () => {
      const repository: CalendarEventRepository = {
        async list() {
          return [
            {
              id: "plain",
              title: "Plain",
              start: "2026-09-15T16:00:00.000Z",
              end: null,
              allDay: false,
            },
          ];
        },
        async get() {
          return {
            id: "plain",
            title: "Plain",
            start: "2026-09-15T16:00:00.000Z",
            end: null,
            allDay: false,
          };
        },
        async create() {
          throw new Error("unused");
        },
        async update() {
          throw new Error("unused");
        },
        async delete() {},
      };

      const { byName } = toolsFor(repository);
      const listed = (await exec(byName.calendar_list_events!)) as {
        events: CalendarEvent[];
      };
      expect(listed.events[0]).toEqual({
        id: "plain",
        title: "Plain",
        start: "2026-09-15T16:00:00.000Z",
        end: null,
        allDay: false,
      });
      expect("metadata" in listed.events[0]!).toBe(false);
    });

    it("serializes nested metadata through the tool path", async () => {
      const repository: CalendarEventRepository = {
        async list() {
          return [
            {
              id: "nested",
              title: "Nested",
              start: "2026-09-15T16:00:00.000Z",
              end: null,
              allDay: false,
              metadata: {
                site: {
                  building: 4,
                  rooms: ["A", "B"],
                },
              },
            },
          ];
        },
        async get() {
          return null;
        },
        async create() {
          throw new Error("unused");
        },
        async update() {
          throw new Error("unused");
        },
        async delete() {},
      };

      const { byName } = toolsFor(repository);
      const listed = (await exec(byName.calendar_list_events!)) as {
        events: CalendarEvent[];
      };
      expect(JSON.parse(JSON.stringify(listed.events[0]!.metadata))).toEqual({
        site: { building: 4, rooms: ["A", "B"] },
      });
    });
  });

  describe("privacy negative path", () => {
    it("never surfaces unprojected host fields through list/get tool output", async () => {
      const appointments = new Map([[SEED_APPOINTMENT.id, SEED_APPOINTMENT]]);
      const { byName } = toolsFor(createProjectingRepository(appointments));

      const listed = (await exec(byName.calendar_list_events!)) as {
        events: CalendarEvent[];
      };
      const got = (await exec(byName.calendar_get_event!, {
        id: "event-1",
      })) as { event: CalendarEvent };

      const payloads = [
        JSON.stringify(listed),
        JSON.stringify(got),
      ].join("\n");

      expect(payloads).toContain("North Campus");
      expect(payloads).toContain("Sarah Chen");
      expect(payloads).not.toContain("tenant-secret");
      expect(payloads).not.toContain("internal-9281");
      expect(payloads).not.toContain("Sensitive internal note");
    });
  });

  describe("write boundary", () => {
    it("rejects metadata on create/update schemas via additionalProperties: false", () => {
      const { byName } = toolsFor(createProjectingRepository(new Map()));

      expect(byName.calendar_create_event!.inputSchema).toMatchObject({
        additionalProperties: false,
      });
      expect(byName.calendar_update_event!.inputSchema).toMatchObject({
        additionalProperties: false,
      });
      expect(
        "metadata" in
          ((byName.calendar_create_event!.inputSchema as { properties: object })
            .properties ?? {}),
      ).toBe(false);
      expect(
        "metadata" in
          ((byName.calendar_update_event!.inputSchema as { properties: object })
            .properties ?? {}),
      ).toBe(false);
    });

    it("preserves repository-owned metadata across core field updates", async () => {
      const appointments = new Map([[SEED_APPOINTMENT.id, { ...SEED_APPOINTMENT }]]);
      const { byName, onEventsChanged } = toolsFor(
        createProjectingRepository(appointments),
      );

      const updated = (await exec(byName.calendar_update_event!, {
        id: "event-1",
        title: "Final Project Review",
        start: "2026-09-18T20:00:00.000Z",
        end: "2026-09-18T21:00:00.000Z",
      })) as { event: CalendarEvent };

      expect(updated.event.title).toBe("Final Project Review");
      expect(updated.event.start).toBe("2026-09-18T20:00:00.000Z");
      expect(updated.event.metadata).toEqual({
        location: "North Campus",
        attendees: ["Sarah Chen", "Michael Torres"],
      });
      expect(onEventsChanged).toHaveBeenCalledOnce();

      const reread = (await exec(byName.calendar_get_event!, {
        id: "event-1",
      })) as { event: CalendarEvent };
      expect(reread.event.metadata).toEqual({
        location: "North Campus",
        attendees: ["Sarah Chen", "Michael Torres"],
      });
      expect(JSON.stringify(reread)).not.toContain("tenant-secret");
    });

    it("survives one-argument execute for metadata list/get/update", async () => {
      const appointments = new Map([[SEED_APPOINTMENT.id, { ...SEED_APPOINTMENT }]]);
      const { byName } = toolsFor(createProjectingRepository(appointments));

      const listOneArg = await (
        byName.calendar_list_events!.execute as (
          input: Record<string, unknown>,
        ) => Promise<unknown>
      )({});
      expect(listOneArg).toMatchObject({
        events: [{ metadata: { location: "North Campus" } }],
      });

      const updateOneArg = await (
        byName.calendar_update_event!.execute as (
          input: Record<string, unknown>,
        ) => Promise<unknown>
      )({ id: "event-1", title: "Renamed" });
      expect(updateOneArg).toMatchObject({
        event: {
          title: "Renamed",
          metadata: { location: "North Campus" },
        },
      });
    });
  });

  describe("legacy repository compatibility", () => {
    it("compiles and runs a 0.1.x-style five-field repository unchanged", async () => {
      const store: CalendarEvent[] = [];
      const legacyRepository: CalendarEventRepository = {
        async list() {
          return store.map((event) => ({ ...event }));
        },
        async get(id) {
          return store.find((event) => event.id === id) ?? null;
        },
        async create(input) {
          const event: CalendarEvent = {
            id: "legacy-1",
            title: input.title,
            start: input.start,
            end: input.end ?? null,
            allDay: input.allDay ?? false,
          };
          store.push(event);
          return { ...event };
        },
        async update(id, input) {
          const index = store.findIndex((event) => event.id === id);
          const current = store[index]!;
          const event: CalendarEvent = {
            id,
            title: input.title ?? current.title,
            start: input.start ?? current.start,
            end: input.end === undefined ? current.end : input.end,
            allDay: input.allDay ?? current.allDay,
          };
          store[index] = event;
          return { ...event };
        },
        async delete(id) {
          const index = store.findIndex((event) => event.id === id);
          store.splice(index, 1);
        },
      };

      const { byName } = toolsFor(legacyRepository);
      await exec(byName.calendar_create_event!, {
        title: "Legacy Create",
        start: "2026-09-15T16:00:00.000Z",
        end: "2026-09-15T17:00:00.000Z",
      });
      const listed = (await exec(byName.calendar_list_events!)) as {
        events: CalendarEvent[];
      };
      expect(listed.events[0]).toEqual({
        id: "legacy-1",
        title: "Legacy Create",
        start: "2026-09-15T16:00:00.000Z",
        end: "2026-09-15T17:00:00.000Z",
        allDay: false,
      });
    });
  });
});
