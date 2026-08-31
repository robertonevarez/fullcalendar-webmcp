import FullCalendar, { type CalendarRef } from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useFullCalendarWebMCP,
  type CalendarEvent,
  type CalendarEventRepository,
} from "protocoltooling";

const sampleRepository: CalendarEventRepository = {
  async list() {
    return [
      {
        id: "evt-1",
        title: "Team Standup",
        start: "2026-09-02T10:00:00Z",
        end: "2026-09-02T10:30:00Z",
        allDay: false,
      },
    ];
  },
  async get(id: string) {
    const list = await this.list();
    return list.find((e) => e.id === id) ?? null;
  },
  async create(input) {
    return {
      id: "evt-created",
      title: input.title,
      start: input.start,
      end: input.end ?? null,
      allDay: input.allDay ?? false,
    };
  },
  async update(id, input) {
    return {
      id,
      title: input.title ?? "updated",
      start: input.start ?? "2026-09-02T10:00:00Z",
      end: input.end ?? null,
      allDay: input.allDay ?? false,
    };
  },
  async delete() {},
};

export default function App() {
  const calendarRef = useRef<CalendarRef>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const reloadEvents = useCallback(async () => {
    const data = await sampleRepository.list();
    setEvents(data);
  }, []);

  useEffect(() => {
    void reloadEvents();
  }, [reloadEvents]);

  useFullCalendarWebMCP({
    calendarRef,
    events: sampleRepository,
    onEventsChanged: reloadEvents,
  });

  return (
    <div>
      <h1>Vite Consumer Fixture</h1>
      <FullCalendar
        ref={calendarRef}
        plugins={[timeGridPlugin]}
        initialView="timeGridWeek"
        events={events.map((e) => ({ ...e, end: e.end ?? undefined }))}
      />
    </div>
  );
}
