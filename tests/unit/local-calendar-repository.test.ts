import { describe, expect, it } from "vitest";
import { LocalCalendarEventRepository } from "../../example/calendar/local-calendar-repository";
import { MapStorage } from "../map-storage";

describe("LocalCalendarEventRepository", () => {
  it("persists stable event identity across repository instances", async () => {
    const storage = new MapStorage();
    const first = new LocalCalendarEventRepository({
      storage,
      createId: () => "event-1",
    });

    const created = await first.create({
      title: "Design Review",
      start: "2026-09-02T14:00:00-06:00",
      end: "2026-09-02T15:00:00-06:00",
    });

    const afterReload = new LocalCalendarEventRepository({ storage });
    expect(await afterReload.get(created.id)).toEqual(created);
  });

  it("uses inclusive start and exclusive end range filtering", async () => {
    const repository = new LocalCalendarEventRepository({
      storage: new MapStorage(),
      createId: () => "event-1",
    });
    await repository.create({
      title: "Design Review",
      start: "2026-09-02T20:00:00.000Z",
      end: "2026-09-02T21:00:00.000Z",
    });

    expect(
      await repository.list({
        start: "2026-09-02T00:00:00.000Z",
        end: "2026-09-03T00:00:00.000Z",
      }),
    ).toHaveLength(1);
    expect(
      await repository.list({ start: "2026-09-03T00:00:00.000Z" }),
    ).toHaveLength(0);
    expect(
      await repository.list({ start: "2026-09-02T21:00:00.000Z" }),
    ).toHaveLength(0);
  });

  it("preserves repository-owned metadata across core updates", async () => {
    const storage = new MapStorage();
    const repository = new LocalCalendarEventRepository({
      storage,
      seedEvents: [
        {
          id: "seed-meta",
          title: "Project Review",
          start: "2026-09-15T16:00:00.000Z",
          end: "2026-09-15T17:00:00.000Z",
          allDay: false,
          metadata: {
            location: "North Campus",
            attendees: ["Sarah Chen"],
          },
        },
      ],
    });

    const updated = await repository.update("seed-meta", {
      title: "Final Project Review",
    });

    expect(updated.metadata).toEqual({
      location: "North Campus",
      attendees: ["Sarah Chen"],
    });
    expect(await repository.get("seed-meta")).toMatchObject({
      title: "Final Project Review",
      metadata: {
        location: "North Campus",
        attendees: ["Sarah Chen"],
      },
    });
  });
});
