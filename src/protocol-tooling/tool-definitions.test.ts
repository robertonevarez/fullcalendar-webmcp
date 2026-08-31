import { describe, expect, it, vi } from "vitest";
import { LocalCalendarEventRepository } from "../calendar/local-calendar-repository";
import { FakeModelContext } from "../test/fake-model-context";
import { MapStorage } from "../test/map-storage";
import { createCalendarTools } from "./tool-definitions";

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

describe("calendar WebMCP tools", () => {
  it("completes persisted agent CRUD and sees a later human change", async () => {
    const storage = new MapStorage();
    const repository = new LocalCalendarEventRepository({
      storage,
      createId: () => "design-review",
    });
    const onEventsChanged = vi.fn();
    const context = new FakeModelContext();
    const controller = new AbortController();
    const tools = createCalendarTools(() => ({
      calendarRef: fakeCalendarRef(),
      events: repository,
      onEventsChanged,
    }));
    await Promise.all(
      tools.map((tool) =>
        context.registerTool(tool, { signal: controller.signal }),
      ),
    );

    const created = (await context.execute("calendar_create_event", {
      title: "Design Review",
      start: "2026-09-02T14:00:00-06:00",
      end: "2026-09-02T15:00:00-06:00",
    })) as { event: { id: string } };
    expect(created.event.id).toBe("design-review");

    await context.execute("calendar_update_event", {
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
    const listed = (await context.execute("calendar_list_events", {
      text: "design review",
    })) as { events: Array<{ start: string }> };
    expect(listed.events[0].start).toBe("2026-09-03T17:00:00.000Z");

    await context.execute("calendar_delete_event", { id: "design-review" });
    const afterDeleteReload = new LocalCalendarEventRepository({ storage });
    expect(await afterDeleteReload.get("design-review")).toBeNull();
    expect(onEventsChanged).toHaveBeenCalledTimes(3);
  });

  it("forwards execution cancellation to the host repository", async () => {
    const signal = new AbortController().signal;
    const list = vi.fn().mockResolvedValue([]);
    const tools = createCalendarTools(() => ({
      calendarRef: fakeCalendarRef(),
      events: { list } as never,
      onEventsChanged: vi.fn(),
    }));
    const listTool = tools.find((tool) => tool.name === "calendar_list_events")!;

    await listTool.execute({}, { signal });
    expect(list).toHaveBeenCalledWith({}, { signal });
  });
});
