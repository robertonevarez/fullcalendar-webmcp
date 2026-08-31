import type { RefObject } from "react";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { LocalCalendarEventRepository } from "../../example/calendar/local-calendar-repository";
import {
  type CalendarEvent,
  type CalendarEventRepository,
  type FullCalendarHandle,
  type FullCalendarWebMCPOptions,
} from "../../src";
import { createCalendarTools } from "../../src/tool-definitions";
import { FakeModelContext } from "../fake-model-context";
import { MapStorage } from "../map-storage";

const TOOL_NAMES = [
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

/** Agent shims sometimes call execute(input) without ToolExecuteCallbackOptions. */
function executeOneArg(
  tool: WebMCP.ModelContextTool,
  input: Record<string, unknown>,
) {
  return (
    tool.execute as (
      inputObject: Record<string, unknown>,
    ) => Promise<unknown>
  )(input);
}

function createHarness(overrides?: {
  storage?: MapStorage;
  createId?: () => string;
  onEventsChanged?: () => unknown;
  events?: CalendarEventRepository;
}) {
  const storage = overrides?.storage ?? new MapStorage();
  const repository =
    overrides?.events ??
    new LocalCalendarEventRepository({
      storage,
      createId: overrides?.createId ?? (() => "design-review"),
    });
  const onEventsChanged = overrides?.onEventsChanged ?? vi.fn();
  const tools = createCalendarTools(() => ({
    calendarRef: fakeCalendarRef(),
    events: repository,
    onEventsChanged,
  }));
  return { storage, repository, onEventsChanged, tools };
}

describe("calendar WebMCP tools", () => {
  it("accepts the structural ref surface shared by FullCalendar React v6 and v7", () => {
    const calendarRef: RefObject<FullCalendarHandle | null> = fakeCalendarRef();
    const options: FullCalendarWebMCPOptions = {
      calendarRef,
      events: {} as CalendarEventRepository,
      onEventsChanged: vi.fn(),
    };

    expectTypeOf(options.calendarRef).toMatchTypeOf<
      RefObject<FullCalendarHandle | null>
    >();
  });

  it("accepts host refresh callbacks that return refreshed data", () => {
    const onEventsChanged = async () => [{ id: "refreshed-event" }];
    const options: FullCalendarWebMCPOptions = {
      calendarRef: fakeCalendarRef(),
      events: {} as CalendarEventRepository,
      onEventsChanged,
    };

    expect(options.onEventsChanged).toBe(onEventsChanged);
  });

  it("survives single-argument execute callbacks used by agent shims", async () => {
    const { tools, repository } = createHarness({
      createId: () => "shim-event",
    });
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

    // Direct one-arg invoke — this threw TypeError before the contract fix.
    await expect(executeOneArg(byName.calendar_list_events, {})).resolves.toEqual({
      events: [],
    });
    await expect(
      executeOneArg(byName.calendar_get_event, { id: "missing" }),
    ).resolves.toEqual({ event: null });

    const created = (await executeOneArg(byName.calendar_create_event, {
      title: "Shim Create",
      start: "2026-09-02T14:00:00-06:00",
      end: "2026-09-02T15:00:00-06:00",
    })) as { event: CalendarEvent };
    expect(created.event.id).toBe("shim-event");

    await expect(
      executeOneArg(byName.calendar_update_event, {
        id: "shim-event",
        title: "Shim Updated",
      }),
    ).resolves.toMatchObject({ event: { title: "Shim Updated" } });

    await expect(
      executeOneArg(byName.calendar_delete_event, { id: "shim-event" }),
    ).resolves.toEqual({ deleted: true, id: "shim-event" });

    expect(await repository.get("shim-event")).toBeNull();
  });

  it("registers and executes every tool through the WebMCP boundary", async () => {
    const { tools, onEventsChanged } = createHarness({
      createId: () => "boundary-event",
    });
    const context = new FakeModelContext();
    await Promise.all(tools.map((tool) => context.registerTool(tool)));

    const registered = await context.getTools();
    expect(registered.map((tool) => tool.name).sort()).toEqual(
      [...TOOL_NAMES].sort(),
    );

    for (const name of TOOL_NAMES) {
      const tool = registered.find((entry) => entry.name === name);
      expect(tool, name).toBeDefined();
    }

    const contextResult = (await context.executeTool("calendar_get_context", {})) as {
      view: string;
      visibleRange: { start: string; end: string };
    };
    expect(contextResult.view).toBe("timeGridWeek");
    expect(contextResult.visibleRange.start).toBe("2026-08-30T06:00:00.000Z");

    const listedEmpty = (await context.executeTool("calendar_list_events", {})) as {
      events: CalendarEvent[];
    };
    expect(listedEmpty.events).toEqual([]);

    const created = (await context.executeTool("calendar_create_event", {
      title: "Boundary Event",
      start: "2026-09-02T14:00:00-06:00",
      end: "2026-09-02T15:00:00-06:00",
    })) as { event: CalendarEvent };
    expect(created.event.id).toBe("boundary-event");

    const got = (await context.executeTool("calendar_get_event", {
      id: "boundary-event",
    })) as { event: CalendarEvent };
    expect(got.event.title).toBe("Boundary Event");

    const updated = (await context.executeTool("calendar_update_event", {
      id: "boundary-event",
      title: "Boundary Updated",
    })) as { event: CalendarEvent };
    expect(updated.event.title).toBe("Boundary Updated");

    const deleted = (await context.executeTool("calendar_delete_event", {
      id: "boundary-event",
    })) as { deleted: boolean; id: string };
    expect(deleted).toEqual({ deleted: true, id: "boundary-event" });

    expect(onEventsChanged).toHaveBeenCalledTimes(3);
  });

  it("runs the full agent sequence context → list → get → create → update → delete", async () => {
    const { tools, repository, onEventsChanged } = createHarness({
      createId: () => "sequence-event",
    });
    const context = new FakeModelContext();
    await Promise.all(tools.map((tool) => context.registerTool(tool)));

    const contextResult = await context.executeTool("calendar_get_context");
    expect(contextResult).toMatchObject({ view: "timeGridWeek" });

    const before = (await context.executeTool("calendar_list_events", {
      text: "sequence",
    })) as { events: CalendarEvent[] };
    expect(before.events).toEqual([]);

    const missing = (await context.executeTool("calendar_get_event", {
      id: "sequence-event",
    })) as { event: CalendarEvent | null };
    expect(missing.event).toBeNull();

    const created = (await context.executeTool("calendar_create_event", {
      title: "Sequence Event",
      start: "2026-09-02T14:00:00-06:00",
      end: "2026-09-02T15:00:00-06:00",
    })) as { event: CalendarEvent };
    expect(created.event.id).toBe("sequence-event");

    const listed = (await context.executeTool("calendar_list_events", {
      text: "sequence",
    })) as { events: CalendarEvent[] };
    expect(listed.events).toHaveLength(1);

    const updated = (await context.executeTool("calendar_update_event", {
      id: "sequence-event",
      start: "2026-09-03T09:00:00-06:00",
      end: "2026-09-03T10:00:00-06:00",
    })) as { event: CalendarEvent };
    expect(updated.event.start).toBe("2026-09-03T15:00:00.000Z");

    await context.executeTool("calendar_delete_event", { id: "sequence-event" });
    expect(await repository.get("sequence-event")).toBeNull();
    expect(onEventsChanged).toHaveBeenCalledTimes(3);
  });

  it("completes persisted agent CRUD and sees a later human change", async () => {
    const storage = new MapStorage();
    const { tools, repository, onEventsChanged } = createHarness({
      storage,
      createId: () => "design-review",
    });
    const context = new FakeModelContext();
    const controller = new AbortController();
    await Promise.all(
      tools.map((tool) =>
        context.registerTool(tool, { signal: controller.signal }),
      ),
    );

    const created = (await context.executeTool("calendar_create_event", {
      title: "Design Review",
      start: "2026-09-02T14:00:00-06:00",
      end: "2026-09-02T15:00:00-06:00",
    })) as { event: { id: string } };
    expect(created.event.id).toBe("design-review");

    await context.executeTool("calendar_update_event", {
      id: "design-review",
      start: "2026-09-03T09:00:00-06:00",
      end: "2026-09-03T10:00:00-06:00",
    });

    const afterReload = new LocalCalendarEventRepository({ storage });
    expect((await afterReload.get("design-review"))?.start).toBe(
      "2026-09-03T15:00:00.000Z",
    );

    // The normal application path changes the same persisted record.
    await repository.update("design-review", {
      start: "2026-09-03T11:00:00-06:00",
      end: "2026-09-03T12:00:00-06:00",
    });
    const listed = (await context.executeTool("calendar_list_events", {
      text: "design review",
    })) as { events: Array<{ start: string }> };
    expect(listed.events[0].start).toBe("2026-09-03T17:00:00.000Z");

    await context.executeTool("calendar_delete_event", { id: "design-review" });
    const afterDeleteReload = new LocalCalendarEventRepository({ storage });
    expect(await afterDeleteReload.get("design-review")).toBeNull();
    expect(onEventsChanged).toHaveBeenCalledTimes(3);
  });

  it("forwards execution cancellation to the host repository", async () => {
    const signal = new AbortController().signal;
    const list = vi.fn().mockResolvedValue([]);
    const tools = createCalendarTools(() => ({
      calendarRef: fakeCalendarRef(),
      events: { list } as unknown as CalendarEventRepository,
      onEventsChanged: vi.fn(),
    }));
    const listTool = tools.find((tool) => tool.name === "calendar_list_events")!;

    await listTool.execute({}, { signal });
    expect(list).toHaveBeenCalledWith({}, { signal });
  });

  it("FakeModelContext executeTool always supplies ToolExecuteCallbackOptions.signal", async () => {
    const list = vi.fn().mockResolvedValue([]);
    const tools = createCalendarTools(() => ({
      calendarRef: fakeCalendarRef(),
      events: { list } as unknown as CalendarEventRepository,
      onEventsChanged: vi.fn(),
    }));
    const context = new FakeModelContext();
    await context.registerTool(tools.find((t) => t.name === "calendar_list_events")!);

    await context.executeTool("calendar_list_events", { text: "x" });

    expect(list).toHaveBeenCalledOnce();
    const [, options] = list.mock.calls[0] as [
      unknown,
      { signal?: AbortSignal },
    ];
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.signal?.aborted).toBe(false);
  });

  it("fails a WebMCP mutation when durable storage rejects the write", async () => {
    const storage = {
      getItem: vi.fn(() => "[]"),
      setItem: vi.fn(() => {
        throw new DOMException("Storage quota exceeded", "QuotaExceededError");
      }),
    };
    const repository = new LocalCalendarEventRepository({
      storage,
      createId: () => "not-persisted",
    });
    const onEventsChanged = vi.fn();
    const context = new FakeModelContext();
    const tools = createCalendarTools(() => ({
      calendarRef: fakeCalendarRef(),
      events: repository,
      onEventsChanged,
    }));
    await Promise.all(tools.map((tool) => context.registerTool(tool)));

    await expect(
      context.executeTool("calendar_create_event", {
        title: "Design Review",
        start: "2026-09-02T14:00:00-06:00",
        end: "2026-09-02T15:00:00-06:00",
      }),
    ).rejects.toThrow("Storage quota exceeded");

    expect(onEventsChanged).not.toHaveBeenCalled();
    expect(await repository.list()).toEqual([]);
  });
});
