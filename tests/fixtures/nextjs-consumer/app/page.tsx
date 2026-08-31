"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useFullCalendarWebMCP,
  type CalendarEvent,
  type CalendarEventRepository,
} from "@protocoltooling/fullcalendar";

// Host Server Action simulation
async function fetchSessionsAction(): Promise<CalendarEvent[]> {
  return [
    {
      id: "session-next-1",
      title: "Driving Lesson — Highway Maneuvers",
      start: "2026-09-03T14:00:00Z",
      end: "2026-09-03T16:00:00Z",
      allDay: false,
    },
  ];
}

const repository: CalendarEventRepository = {
  async list() {
    return fetchSessionsAction();
  },
  async get(id: string) {
    const list = await fetchSessionsAction();
    return list.find((e) => e.id === id) ?? null;
  },
  async create(input) {
    return {
      id: `session-${Date.now()}`,
      title: input.title,
      start: input.start,
      end: input.end ?? null,
      allDay: input.allDay ?? false,
    };
  },
  async update(id, input) {
    return {
      id,
      title: input.title ?? "Updated",
      start: input.start ?? "2026-09-03T14:00:00Z",
      end: input.end ?? null,
      allDay: input.allDay ?? false,
    };
  },
  async delete() {},
};

export default function CalendarPage() {
  // FullCalendar React v6 class instance ref
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const refetch = useCallback(async () => {
    const data = await repository.list();
    setEvents(data);
    return data;
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useFullCalendarWebMCP({
    calendarRef,
    events: repository,
    onEventsChanged: refetch,
  });

  return (
    <main>
      <h1>Next.js 16 Host with FullCalendar v6</h1>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        events={events.map((e) => ({ ...e, end: e.end ?? undefined }))}
      />
    </main>
  );
}
