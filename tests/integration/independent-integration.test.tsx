import { act, render, screen } from "@testing-library/react";
import React, { useCallback, useEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useFullCalendarWebMCP,
  type CalendarEvent,
  type CalendarEventQuery,
  type CalendarEventRepository,
  type CreateCalendarEventInput,
  type FullCalendarHandle,
  type UpdateCalendarEventInput,
} from "../../src";
import { FakeModelContext, setModelContext } from "../fake-model-context";

// ---------------------------------------------------------------------------
// Independent Host Application Model (e.g. Next.js + Supabase / PostgreSQL)
// ---------------------------------------------------------------------------

interface HostSessionRow {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  location_id: string;
  staff_id: string;
  student_ids: string[];
  vehicle_id: string | null;
  updated_at: string;
}

class IndependentHostDatabase {
  private rows = new Map<string, HostSessionRow>();

  constructor(initialRows: HostSessionRow[] = []) {
    for (const row of initialRows) {
      this.rows.set(row.id, { ...row });
    }
  }

  async selectByLocation(
    locationId: string,
    signal?: AbortSignal,
  ): Promise<HostSessionRow[]> {
    signal?.throwIfAborted();
    return Array.from(this.rows.values())
      .filter((r) => r.location_id === locationId)
      .map((r) => ({ ...r }));
  }

  async selectById(
    id: string,
    signal?: AbortSignal,
  ): Promise<HostSessionRow | null> {
    signal?.throwIfAborted();
    const found = this.rows.get(id);
    return found ? { ...found } : null;
  }

  async insert(
    row: Omit<HostSessionRow, "updated_at">,
    signal?: AbortSignal,
  ): Promise<HostSessionRow> {
    signal?.throwIfAborted();
    if (this.rows.has(row.id)) {
      throw new Error(`Duplicate primary key: ${row.id}`);
    }
    const inserted: HostSessionRow = {
      ...row,
      updated_at: new Date().toISOString(),
    };
    this.rows.set(row.id, inserted);
    return { ...inserted };
  }

  async update(
    id: string,
    updates: Partial<Omit<HostSessionRow, "id" | "updated_at">>,
    signal?: AbortSignal,
  ): Promise<HostSessionRow> {
    signal?.throwIfAborted();
    const existing = this.rows.get(id);
    if (!existing) {
      throw new Error(`Record not found: ${id}`);
    }
    const updated: HostSessionRow = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.rows.set(id, updated);
    return { ...updated };
  }

  async delete(id: string, signal?: AbortSignal): Promise<boolean> {
    signal?.throwIfAborted();
    if (!this.rows.has(id)) {
      throw new Error(`Record not found: ${id}`);
    }
    return this.rows.delete(id);
  }
}

// ---------------------------------------------------------------------------
// Host Server Actions / Backend API
// ---------------------------------------------------------------------------

function createHostServerActions(db: IndependentHostDatabase) {
  return {
    async fetchSessionsAction(locationId: string, signal?: AbortSignal) {
      return db.selectByLocation(locationId, signal);
    },
    async createSessionAction(
      input: {
        title: string;
        start_time: string;
        end_time?: string | null;
        location_id: string;
        staff_id: string;
        student_ids?: string[];
        vehicle_id?: string | null;
      },
      signal?: AbortSignal,
    ) {
      const id = `session-${crypto.randomUUID()}`;
      const row = await db.insert(
        {
          id,
          title: input.title,
          start_time: input.start_time,
          end_time: input.end_time ?? null,
          location_id: input.location_id,
          staff_id: input.staff_id,
          student_ids: input.student_ids ?? [],
          vehicle_id: input.vehicle_id ?? null,
        },
        signal,
      );
      return { data: row };
    },
    async updateSessionAction(
      id: string,
      updates: {
        title?: string;
        start_time?: string;
        end_time?: string | null;
      },
      signal?: AbortSignal,
    ) {
      const row = await db.update(id, updates, signal);
      return { data: row };
    },
    async deleteSessionAction(id: string, signal?: AbortSignal) {
      await db.delete(id, signal);
      return { success: true };
    },
  };
}

// ---------------------------------------------------------------------------
// Host Adapter mapping Server Actions to CalendarEventRepository
// ---------------------------------------------------------------------------

function sessionToCalendarEvent(row: HostSessionRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    start: new Date(row.start_time).toISOString(),
    end: row.end_time ? new Date(row.end_time).toISOString() : null,
    allDay: false,
  };
}

class ServerActionsCalendarRepository implements CalendarEventRepository {
  constructor(
    private actions: ReturnType<typeof createHostServerActions>,
    private locationId: string,
    private defaultStaffId = "staff-default",
  ) {}

  async list(
    query?: CalendarEventQuery,
    options?: { signal?: AbortSignal },
  ): Promise<CalendarEvent[]> {
    const rows = await this.actions.fetchSessionsAction(
      this.locationId,
      options?.signal,
    );
    let events = rows.map(sessionToCalendarEvent);

    if (query?.start) {
      const startBound = new Date(query.start).getTime();
      events = events.filter((e) => new Date(e.start).getTime() >= startBound);
    }
    if (query?.end) {
      const endBound = new Date(query.end).getTime();
      events = events.filter((e) => new Date(e.start).getTime() < endBound);
    }
    if (query?.text) {
      const needle = query.text.toLowerCase();
      events = events.filter((e) => e.title.toLowerCase().includes(needle));
    }
    return events;
  }

  async get(
    id: string,
    options?: { signal?: AbortSignal },
  ): Promise<CalendarEvent | null> {
    const rows = await this.actions.fetchSessionsAction(
      this.locationId,
      options?.signal,
    );
    const found = rows.find((r) => r.id === id);
    return found ? sessionToCalendarEvent(found) : null;
  }

  async create(
    input: CreateCalendarEventInput,
    options?: { signal?: AbortSignal },
  ): Promise<CalendarEvent> {
    const result = await this.actions.createSessionAction(
      {
        title: input.title,
        start_time: input.start,
        end_time: input.end,
        location_id: this.locationId,
        staff_id: this.defaultStaffId,
      },
      options?.signal,
    );
    return sessionToCalendarEvent(result.data);
  }

  async update(
    id: string,
    input: UpdateCalendarEventInput,
    options?: { signal?: AbortSignal },
  ): Promise<CalendarEvent> {
    const result = await this.actions.updateSessionAction(
      id,
      {
        title: input.title,
        start_time: input.start,
        end_time: input.end,
      },
      options?.signal,
    );
    return sessionToCalendarEvent(result.data);
  }

  async delete(id: string, options?: { signal?: AbortSignal }): Promise<void> {
    await this.actions.deleteSessionAction(id, options?.signal);
  }
}

// ---------------------------------------------------------------------------
// Host React Calendar Page Component (Next.js client-side page)
// ---------------------------------------------------------------------------

function HostCalendarPage({
  repository,
  calendarRef,
  onRefreshed,
}: {
  repository: CalendarEventRepository;
  calendarRef: React.RefObject<FullCalendarHandle | null>;
  onRefreshed?: (events: CalendarEvent[]) => void;
}) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const refetchSessions = useCallback(async () => {
    const list = await repository.list();
    setEvents(list);
    onRefreshed?.(list);
    return list; // host function returns data!
  }, [repository, onRefreshed]);

  useEffect(() => {
    void refetchSessions();
  }, [refetchSessions]);

  // Protocol Tooling Hook Integration
  useFullCalendarWebMCP({
    calendarRef,
    events: repository,
    onEventsChanged: refetchSessions,
  });

  return (
    <div data-testid="calendar-host-page">
      <div data-testid="event-count">{events.length}</div>
      <ul>
        {events.map((e) => (
          <li key={e.id} data-testid={`event-item-${e.id}`}>
            <span data-testid={`event-title-${e.id}`}>{e.title}</span>
            <span data-testid={`event-start-${e.id}`}>{e.start}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Protocol Tooling independent integration (Next.js / Server Actions / Database)", () => {
  let context: FakeModelContext;

  beforeEach(() => {
    context = new FakeModelContext();
    setModelContext(context);
  });

  it("validates the complete 15-step shared-state model against server-backed persistence", async () => {
    const db = new IndependentHostDatabase([
      {
        id: "session-seed-1",
        title: "Behind-the-Wheel Driving Lesson",
        start_time: "2026-09-02T10:00:00.000Z",
        end_time: "2026-09-02T12:00:00.000Z",
        location_id: "loc-downtown",
        staff_id: "staff-1",
        student_ids: ["student-1"],
        vehicle_id: "car-1",
        updated_at: "2026-08-30T00:00:00.000Z",
      },
    ]);
    const serverActions = createHostServerActions(db);
    const repository = new ServerActionsCalendarRepository(
      serverActions,
      "loc-downtown",
    );

    const fakeRef: React.RefObject<FullCalendarHandle | null> = {
      current: {
        getApi: () => ({
          getOption: () => "local",
          view: {
            type: "timeGridWeek",
            activeStart: new Date("2026-08-30T00:00:00.000Z"),
            activeEnd: new Date("2026-09-06T00:00:00.000Z"),
          },
        }),
      },
    };

    const { unmount } = render(
      <HostCalendarPage repository={repository} calendarRef={fakeRef} />,
    );

    // Initial render reflects database record
    await act(async () => {});
    expect(screen.getByTestId("event-count").textContent).toBe("1");
    expect(screen.getByTestId("event-title-session-seed-1").textContent).toBe(
      "Behind-the-Wheel Driving Lesson",
    );

    // Query events through WebMCP
    const listedInitial = (await context.execute("calendar_list_events", {
      text: "Behind-the-Wheel",
    })) as { events: CalendarEvent[] };
    expect(listedInitial.events).toHaveLength(1);
    expect(listedInitial.events[0].id).toBe("session-seed-1");

    // Create an event through WebMCP
    const createResult = (await context.execute("calendar_create_event", {
      title: "Highway Maneuvers Evaluation",
      start: "2026-09-03T14:00:00-06:00",
      end: "2026-09-03T16:00:00-06:00",
    })) as { event: CalendarEvent };
    const createdId = createResult.event.id;
    expect(createdId).toMatch(/^session-/);

    // FullCalendar UI reflects it
    await act(async () => {});
    expect(screen.getByTestId("event-count").textContent).toBe("2");
    expect(screen.getByTestId(`event-title-${createdId}`).textContent).toBe(
      "Highway Maneuvers Evaluation",
    );

    // Reload (simulate reading database directly)
    const freshDbState = await db.selectByLocation("loc-downtown");
    const persistedInDb = freshDbState.find((r) => r.id === createdId);
    expect(persistedInDb).toBeDefined();
    expect(persistedInDb?.title).toBe("Highway Maneuvers Evaluation");

    // Update it through WebMCP
    const updateResult = (await context.execute("calendar_update_event", {
      id: createdId,
      title: "Highway Maneuvers Evaluation (Rescheduled)",
      start: "2026-09-04T09:00:00-06:00",
      end: "2026-09-04T11:00:00-06:00",
    })) as { event: CalendarEvent };
    expect(updateResult.event.title).toBe(
      "Highway Maneuvers Evaluation (Rescheduled)",
    );

    // UI reflects the persisted change
    await act(async () => {});
    expect(screen.getByTestId(`event-title-${createdId}`).textContent).toBe(
      "Highway Maneuvers Evaluation (Rescheduled)",
    );

    // Modify it through human interaction
    await serverActions.updateSessionAction(createdId, {
      title: "Highway Maneuvers Evaluation (Staff Confirmed)",
    });

    // Confirm DB updated directly
    const dbRecordAfterHuman = await db.selectById(createdId);
    expect(dbRecordAfterHuman?.title).toBe(
      "Highway Maneuvers Evaluation (Staff Confirmed)",
    );

    // Query it again through WebMCP
    const queryAfterHuman = (await context.execute("calendar_get_event", {
      id: createdId,
    })) as { event: CalendarEvent };
    expect(queryAfterHuman.event.title).toBe(
      "Highway Maneuvers Evaluation (Staff Confirmed)",
    );

    // Delete it through WebMCP
    const deleteResult = (await context.execute("calendar_delete_event", {
      id: createdId,
    })) as { deleted: boolean; event: CalendarEvent };
    expect(deleteResult.deleted).toBe(true);
    expect(deleteResult.event.id).toBe(createdId);
    expect(deleteResult.event.title).toContain("Highway Maneuvers");

    // UI reflects deletion
    await act(async () => {});
    expect(screen.getByTestId("event-count").textContent).toBe("1");
    expect(screen.queryByTestId(`event-title-${createdId}`)).toBeNull();

    // Confirm deletion in database
    const dbRecordAfterDelete = await db.selectById(createdId);
    expect(dbRecordAfterDelete).toBeNull();

    unmount();
  });

  it("handles backend persistence rejections without falsely updating UI or claiming WebMCP success", async () => {
    const db = new IndependentHostDatabase();
    const serverActions = createHostServerActions(db);
    const repository = new ServerActionsCalendarRepository(
      serverActions,
      "loc-downtown",
    );

    vi.spyOn(serverActions, "updateSessionAction").mockRejectedValue(
      new Error("PostgreSQL connection timeout: 5432"),
    );

    const onRefreshed = vi.fn();
    const fakeRef: React.RefObject<FullCalendarHandle | null> = {
      current: {
        getApi: () => ({
          getOption: () => "local",
          view: {
            type: "timeGridWeek",
            activeStart: new Date("2026-08-30T00:00:00.000Z"),
            activeEnd: new Date("2026-09-06T00:00:00.000Z"),
          },
        }),
      },
    };

    render(
      <HostCalendarPage
        repository={repository}
        calendarRef={fakeRef}
        onRefreshed={onRefreshed}
      />,
    );

    await act(async () => {});
    onRefreshed.mockClear();

    await expect(
      context.execute("calendar_update_event", {
        id: "non-existent-or-failing",
        title: "Will Fail",
        start: "2026-09-02T10:00:00-06:00",
      }),
    ).rejects.toThrow("PostgreSQL connection timeout: 5432");

    expect(onRefreshed).not.toHaveBeenCalled();
  });

  it("forwards AbortSignal cancellation to async server actions", async () => {
    const db = new IndependentHostDatabase();
    const serverActions = createHostServerActions(db);
    const fetchSpy = vi.spyOn(serverActions, "fetchSessionsAction");
    const repository = new ServerActionsCalendarRepository(
      serverActions,
      "loc-downtown",
    );

    const controller = new AbortController();
    controller.abort(new DOMException("User aborted request", "AbortError"));

    await expect(
      repository.list({}, { signal: controller.signal }),
    ).rejects.toThrow("User aborted request");

    expect(fetchSpy).toHaveBeenCalledWith("loc-downtown", controller.signal);
  });

  it("reads calendar context via FullCalendarHandle ref interface", async () => {
    const db = new IndependentHostDatabase();
    const serverActions = createHostServerActions(db);
    const repository = new ServerActionsCalendarRepository(
      serverActions,
      "loc-downtown",
    );

    const fakeRef: React.RefObject<FullCalendarHandle | null> = {
      current: {
        getApi: () => ({
          getOption: (opt: string) =>
            opt === "timeZone" ? "America/Denver" : undefined,
          view: {
            type: "timeGridDay",
            activeStart: new Date("2026-09-02T00:00:00.000Z"),
            activeEnd: new Date("2026-09-03T00:00:00.000Z"),
          },
        }),
      },
    };

    render(
      <HostCalendarPage repository={repository} calendarRef={fakeRef} />,
    );

    const contextResult = (await context.execute(
      "calendar_get_context",
      {},
    )) as {
      fullCalendarTimeZone: string;
      view: string;
      visibleRange: { start: string; end: string };
    };

    expect(contextResult.fullCalendarTimeZone).toBe("America/Denver");
    expect(contextResult.view).toBe("timeGridDay");
    expect(contextResult.visibleRange.start).toBe("2026-09-02T00:00:00.000Z");
    expect(contextResult.visibleRange.end).toBe("2026-09-03T00:00:00.000Z");
  });
});
