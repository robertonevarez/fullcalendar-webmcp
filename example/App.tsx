import FullCalendar, {
  type CalendarRef,
  type EventApi,
  type EventDropInfo,
  type EventResizeDoneInfo,
} from "@fullcalendar/react";
import breezyTheme from "@fullcalendar/react/themes/breezy";
import interactionPlugin from "@fullcalendar/react/interaction";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFullCalendarWebMCP, type CalendarEvent } from "../src";
import { LocalCalendarEventRepository } from "./calendar/local-calendar-repository";
import { createSeedEvents } from "./calendar/seed-events";

const repository = new LocalCalendarEventRepository({
  seedEvents: createSeedEvents(),
});

function eventUpdate(event: EventApi) {
  return {
    title: event.title,
    start: event.start?.toISOString(),
    end: event.end?.toISOString() ?? null,
    allDay: event.allDay,
  };
}

export default function App() {
  const calendarRef = useRef<CalendarRef>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [syncState, setSyncState] = useState("Loading persisted events…");

  const reloadEvents = useCallback(async () => {
    setEvents(await repository.list());
    setSyncState(`Persisted locally · ${new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`);
  }, []);

  useEffect(() => {
    void reloadEvents();
  }, [reloadEvents]);

  useFullCalendarWebMCP({ calendarRef, events: repository, onEventsChanged: reloadEvents });

  const persistHumanMove = useCallback(
    async (info: EventDropInfo | EventResizeDoneInfo) => {
      try {
        const input = eventUpdate(info.event);
        if (!input.start) throw new Error("FullCalendar returned no event start.");
        await repository.update(info.event.id, input);
        await reloadEvents();
      } catch {
        info.revert();
        setSyncState("Persistence failed · move reverted");
      }
    },
    [reloadEvents],
  );

  return (
    <main className="page-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">Protocol Tooling · Phase 0</p>
          <h1>Your calendar,<br />now agent-readable.</h1>
        </div>
        <div className="status-card" aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          <div>
            <strong>Shared state</strong>
            <span>{syncState}</span>
          </div>
        </div>
      </header>

      <section className="workspace" aria-label="Calendar proof">
        <aside className="proof-panel">
          <div>
            <p className="panel-label">Golden path</p>
            <ol>
              <li>“What do I have Wednesday?”</li>
              <li>“Schedule Design Review Wednesday at 2 PM for one hour.”</li>
              <li>“Move Design Review to Thursday morning.”</li>
            </ol>
          </div>
          <div className="human-note">
            <span>Human path</span>
            <p>Drag or resize any event. The ordinary FullCalendar callback persists it; the agent reads the same store.</p>
          </div>
        </aside>

        <div className="calendar-frame">
          <FullCalendar
            ref={calendarRef}
            plugins={[breezyTheme, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            events={events.map((event) => ({
              ...event,
              end: event.end ?? undefined,
            }))}
            editable
            nowIndicator
            allDaySlot={false}
            scrollTime="08:00:00"
            slotMinTime="07:00:00"
            slotMaxTime="20:00:00"
            height="auto"
            headerToolbar={{
              start: "prev,next today",
              center: "title",
              end: "timeGridWeek,timeGridDay",
            }}
            eventDrop={(info) => void persistHumanMove(info)}
            eventResize={(info) => void persistHumanMove(info)}
          />
        </div>
      </section>
    </main>
  );
}
