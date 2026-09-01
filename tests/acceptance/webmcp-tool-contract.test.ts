import { describe, expect, it, vi } from "vitest";
import { LocalCalendarEventRepository } from "../../example/calendar/local-calendar-repository";
import type { CalendarEvent } from "../../src";
import { createCalendarTools } from "../../src/tool-definitions";
import { FakeModelContext } from "../fake-model-context";
import { MapStorage } from "../map-storage";

/**
 * P0.2 acceptance: six-tool product contract + the exact one-arg shim
 * that crashed in 0.1.0. FakeModelContext always supplies `{ signal }`, so
 * one-arg coverage must call `tool.execute(input)` directly.
 */

const TOOL_NAMES = [
  "calendar_get_context",
  "calendar_list_events",
  "calendar_get_event",
  "calendar_create_event",
  "calendar_update_event",
  "calendar_delete_event",
] as const;

const REPOSITORY_BACKED_TOOLS = [
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

/** Production failure shape: execute(input) with no ToolExecuteCallbackOptions. */
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

function createHarness(createId = () => "acceptance-event") {
  const storage = new MapStorage();
  const onEventsChanged = vi.fn();
  const repository = new LocalCalendarEventRepository({ storage, createId });
  const tools = createCalendarTools(() => ({
    calendarRef: fakeCalendarRef(),
    events: repository,
    onEventsChanged,
  }));
  const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
  return { storage, repository, onEventsChanged, tools, byName };
}

describe("P0.2 WebMCP tool contract acceptance", () => {
  it.each(REPOSITORY_BACKED_TOOLS)(
    "survives one-argument execute for %s (0.1.0 production failure)",
    async (toolName) => {
      const { byName, repository } = createHarness(() => "one-arg-event");
      const tool = byName[toolName]!;

      if (toolName === "calendar_list_events") {
        await expect(executeOneArg(tool, {})).resolves.toEqual({ events: [] });
        return;
      }

      if (toolName === "calendar_get_event") {
        await expect(executeOneArg(tool, { id: "missing" })).resolves.toEqual({
          event: null,
        });
        return;
      }

      if (toolName === "calendar_create_event") {
        const created = (await executeOneArg(tool, {
          title: "One Arg Create",
          start: "2026-09-02T14:00:00-06:00",
          end: "2026-09-02T15:00:00-06:00",
        })) as { event: CalendarEvent };
        expect(created.event.id).toBe("one-arg-event");
        return;
      }

      if (toolName === "calendar_update_event") {
        await repository.create({
          title: "Seed",
          start: "2026-09-02T14:00:00-06:00",
          end: "2026-09-02T15:00:00-06:00",
        });
        await expect(
          executeOneArg(tool, { id: "one-arg-event", title: "Updated" }),
        ).resolves.toMatchObject({ event: { title: "Updated" } });
        return;
      }

      if (toolName === "calendar_delete_event") {
        await repository.create({
          title: "Seed",
          start: "2026-09-02T14:00:00-06:00",
          end: "2026-09-02T15:00:00-06:00",
        });
        await expect(
          executeOneArg(tool, { id: "one-arg-event" }),
        ).resolves.toMatchObject({
          deleted: true,
          event: { id: "one-arg-event", title: "Seed" },
        });
        expect(await repository.get("one-arg-event")).toBeNull();
      }
    },
  );

  it("survives one-argument execute for calendar_get_context", async () => {
    const { byName } = createHarness();
    await expect(executeOneArg(byName.calendar_get_context!, {})).resolves.toMatchObject({
      view: "timeGridWeek",
      fullCalendarTimeZone: "local",
    });
  });

  it.each(TOOL_NAMES)(
    "registers and executes %s individually through the WebMCP boundary",
    async (toolName) => {
      const { tools, repository, onEventsChanged } = createHarness(
        () => "per-tool-event",
      );
      const context = new FakeModelContext();
      await Promise.all(tools.map((tool) => context.registerTool(tool)));

      expect(context.tools.has(toolName)).toBe(true);

      if (toolName === "calendar_get_context") {
        await expect(
          context.executeTool("calendar_get_context", {}),
        ).resolves.toMatchObject({ view: "timeGridWeek" });
        return;
      }

      if (toolName === "calendar_list_events") {
        await expect(
          context.executeTool("calendar_list_events", {}),
        ).resolves.toEqual({ events: [] });
        return;
      }

      if (toolName === "calendar_get_event") {
        await expect(
          context.executeTool("calendar_get_event", { id: "missing" }),
        ).resolves.toEqual({ event: null });
        return;
      }

      if (toolName === "calendar_create_event") {
        const created = (await context.executeTool("calendar_create_event", {
          title: "Per Tool",
          start: "2026-09-02T14:00:00-06:00",
          end: "2026-09-02T15:00:00-06:00",
        })) as { event: CalendarEvent };
        expect(created.event.id).toBe("per-tool-event");
        expect(onEventsChanged).toHaveBeenCalledOnce();
        return;
      }

      if (toolName === "calendar_update_event") {
        await repository.create({
          title: "Seed",
          start: "2026-09-02T14:00:00-06:00",
          end: "2026-09-02T15:00:00-06:00",
        });
        onEventsChanged.mockClear();
        await expect(
          context.executeTool("calendar_update_event", {
            id: "per-tool-event",
            title: "Updated",
          }),
        ).resolves.toMatchObject({ event: { title: "Updated" } });
        expect(onEventsChanged).toHaveBeenCalledOnce();
        return;
      }

      if (toolName === "calendar_delete_event") {
        await repository.create({
          title: "Seed",
          start: "2026-09-02T14:00:00-06:00",
          end: "2026-09-02T15:00:00-06:00",
        });
        onEventsChanged.mockClear();
        await expect(
          context.executeTool("calendar_delete_event", { id: "per-tool-event" }),
        ).resolves.toMatchObject({
          deleted: true,
          event: { id: "per-tool-event", title: "Seed" },
        });
        expect(onEventsChanged).toHaveBeenCalledOnce();
      }
    },
  );

  it("runs the full six-tool product sequence", async () => {
    const { tools, repository, onEventsChanged } = createHarness(
      () => "sequence-event",
    );
    const context = new FakeModelContext();
    await Promise.all(tools.map((tool) => context.registerTool(tool)));

    expect((await context.getTools()).map((t) => t.name).sort()).toEqual(
      [...TOOL_NAMES].sort(),
    );

    await expect(
      context.executeTool("calendar_get_context", {}),
    ).resolves.toMatchObject({ view: "timeGridWeek" });

    await expect(
      context.executeTool("calendar_list_events", { text: "sequence" }),
    ).resolves.toEqual({ events: [] });

    await expect(
      context.executeTool("calendar_get_event", { id: "sequence-event" }),
    ).resolves.toEqual({ event: null });

    const created = (await context.executeTool("calendar_create_event", {
      title: "Sequence Event",
      start: "2026-09-02T14:00:00-06:00",
      end: "2026-09-02T15:00:00-06:00",
    })) as { event: CalendarEvent };
    expect(created.event.id).toBe("sequence-event");

    const got = (await context.executeTool("calendar_get_event", {
      id: "sequence-event",
    })) as { event: CalendarEvent };
    expect(got.event.title).toBe("Sequence Event");

    await context.executeTool("calendar_update_event", {
      id: "sequence-event",
      title: "Sequence Updated",
    });

    await context.executeTool("calendar_delete_event", {
      id: "sequence-event",
    });
    expect(await repository.get("sequence-event")).toBeNull();
    expect(onEventsChanged).toHaveBeenCalledTimes(3);
  });
});
