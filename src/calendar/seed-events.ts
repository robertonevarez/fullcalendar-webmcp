import type { CalendarEvent } from "./types";

function nextWeekday(day: number, hour: number, minute = 0) {
  const date = new Date();
  const daysAhead = (day - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() < Date.now()) date.setDate(date.getDate() + 7);
  return date;
}

function event(
  id: string,
  title: string,
  day: number,
  hour: number,
  durationMinutes: number,
): CalendarEvent {
  const start = nextWeekday(day, hour);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return {
    id,
    title,
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: false,
  };
}

export function createSeedEvents(): CalendarEvent[] {
  return [
    event("seed-planning-sync", "Planning sync", 3, 10, 45),
    event("seed-research-block", "Research block", 5, 15, 60),
  ];
}
