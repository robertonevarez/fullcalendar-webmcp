import type { RefObject } from "react";
import { describe, expectTypeOf, it } from "vitest";
import {
  useFullCalendarWebMCP,
  type CalendarEvent,
  type CalendarEventQuery,
  type CalendarEventRepository,
  type CreateCalendarEventInput,
  type FullCalendarHandle,
  type FullCalendarWebMCPOptions,
  type UpdateCalendarEventInput,
} from "../../src";

// Mock FullCalendar v6 React component class instance shape
class FullCalendarV6ClassMock {
  getApi() {
    return {
      getOption(name: string): unknown {
        return name === "timeZone" ? "America/New_York" : undefined;
      },
      view: {
        type: "dayGridMonth",
        activeStart: new Date("2026-09-01T00:00:00Z"),
        activeEnd: new Date("2026-10-01T00:00:00Z"),
      },
      formatDate: (d: Date) => d.toISOString(),
      render: () => {},
      destroy: () => {},
    };
  }
}

// Mock FullCalendar v7 React CalendarRef interface shape
interface FullCalendarV7CalendarRefMock {
  getApi(): {
    getOption(name: string): unknown;
    view: {
      type: string;
      activeStart: Date;
      activeEnd: Date;
    };
  };
}

describe("Public API Type Contracts", () => {
  it("accepts FullCalendar React v6 class component ref", () => {
    const v6Ref: RefObject<FullCalendarV6ClassMock | null> = {
      current: new FullCalendarV6ClassMock(),
    };

    expectTypeOf(v6Ref).toMatchTypeOf<RefObject<FullCalendarHandle | null>>();

    const options: FullCalendarWebMCPOptions = {
      calendarRef: v6Ref,
      events: {} as CalendarEventRepository,
      onEventsChanged: () => {},
    };

    expectTypeOf(options.calendarRef).toMatchTypeOf<
      RefObject<FullCalendarHandle | null>
    >();
  });

  it("accepts FullCalendar React v7 CalendarRef interface ref", () => {
    const v7Ref: RefObject<FullCalendarV7CalendarRefMock | null> = {
      current: {
        getApi: () => ({
          getOption: () => "local",
          view: {
            type: "timeGridWeek",
            activeStart: new Date(),
            activeEnd: new Date(),
          },
        }),
      },
    };

    expectTypeOf(v7Ref).toMatchTypeOf<RefObject<FullCalendarHandle | null>>();

    const options: FullCalendarWebMCPOptions = {
      calendarRef: v7Ref,
      events: {} as CalendarEventRepository,
      onEventsChanged: () => {},
    };

    expectTypeOf(options.calendarRef).toMatchTypeOf<
      RefObject<FullCalendarHandle | null>
    >();
  });

  it("accepts diverse onEventsChanged signatures (sync void, async void, async returning data)", () => {
    const syncVoid = () => {};
    const asyncVoid = async () => {};
    const asyncReturningArray = async () => [{ id: "session-1" }];
    const asyncReturningObject = async () => ({ refreshedAt: Date.now() });

    expectTypeOf({
      calendarRef: { current: null },
      events: {} as CalendarEventRepository,
      onEventsChanged: syncVoid,
    }).toMatchTypeOf<FullCalendarWebMCPOptions>();

    expectTypeOf({
      calendarRef: { current: null },
      events: {} as CalendarEventRepository,
      onEventsChanged: asyncVoid,
    }).toMatchTypeOf<FullCalendarWebMCPOptions>();

    expectTypeOf({
      calendarRef: { current: null },
      events: {} as CalendarEventRepository,
      onEventsChanged: asyncReturningArray,
    }).toMatchTypeOf<FullCalendarWebMCPOptions>();

    expectTypeOf({
      calendarRef: { current: null },
      events: {} as CalendarEventRepository,
      onEventsChanged: asyncReturningObject,
    }).toMatchTypeOf<FullCalendarWebMCPOptions>();
  });

  it("validates full asynchronous CalendarEventRepository contract implementation", () => {
    class AsyncHostRepository implements CalendarEventRepository {
      async list(
        query?: CalendarEventQuery,
        options?: { signal?: AbortSignal },
      ): Promise<CalendarEvent[]> {
        options?.signal?.throwIfAborted();
        return query?.text ? [] : [];
      }

      async get(
        id: string,
        options?: { signal?: AbortSignal },
      ): Promise<CalendarEvent | null> {
        options?.signal?.throwIfAborted();
        return id ? null : null;
      }

      async create(
        input: CreateCalendarEventInput,
        options?: { signal?: AbortSignal },
      ): Promise<CalendarEvent> {
        options?.signal?.throwIfAborted();
        return {
          id: "new-id",
          title: input.title,
          start: input.start,
          end: input.end ?? null,
          allDay: input.allDay ?? false,
        };
      }

      async update(
        id: string,
        input: UpdateCalendarEventInput,
        options?: { signal?: AbortSignal },
      ): Promise<CalendarEvent> {
        options?.signal?.throwIfAborted();
        return {
          id,
          title: input.title ?? "existing",
          start: input.start ?? new Date().toISOString(),
          end: input.end ?? null,
          allDay: input.allDay ?? false,
        };
      }

      async delete(
        id: string,
        options?: { signal?: AbortSignal },
      ): Promise<void> {
        options?.signal?.throwIfAborted();
      }
    }

    const repo = new AsyncHostRepository();
    expectTypeOf(repo).toMatchTypeOf<CalendarEventRepository>();

    const options: FullCalendarWebMCPOptions = {
      calendarRef: { current: null },
      events: repo,
      onEventsChanged: async () => {},
    };

    expectTypeOf(useFullCalendarWebMCP).toBeCallableWith(options);
  });
});
