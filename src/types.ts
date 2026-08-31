import type { RefObject } from "react";

/**
 * Normalized calendar event model.
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
}

/**
 * Input payload for creating a new calendar event.
 */
export interface CreateCalendarEventInput {
  title: string;
  start: string;
  end?: string | null;
  allDay?: boolean;
}

/**
 * Input payload for updating an existing calendar event.
 */
export interface UpdateCalendarEventInput {
  title?: string;
  start?: string;
  end?: string | null;
  allDay?: boolean;
}

/**
 * Filter criteria for querying calendar events.
 */
export interface CalendarEventQuery {
  start?: string;
  end?: string;
  text?: string;
}

/**
 * Authoritative host repository contract for calendar event persistence.
 * The host application implements this interface over its existing storage or backend API.
 */
export interface CalendarEventRepository {
  list(
    query?: CalendarEventQuery,
    options?: { signal?: AbortSignal },
  ): Promise<CalendarEvent[]>;
  get(
    id: string,
    options?: { signal?: AbortSignal },
  ): Promise<CalendarEvent | null>;
  create(
    input: CreateCalendarEventInput,
    options?: { signal?: AbortSignal },
  ): Promise<CalendarEvent>;
  update(
    id: string,
    input: UpdateCalendarEventInput,
    options?: { signal?: AbortSignal },
  ): Promise<CalendarEvent>;
  delete(id: string, options?: { signal?: AbortSignal }): Promise<void>;
}

/**
 * Minimal structural FullCalendar surface required by WebMCP tools.
 * Compatible with FullCalendar React v6 class instances and v7 CalendarRef handles.
 */
export interface FullCalendarHandle {
  getApi(): {
    getOption(name: string): unknown;
    view: {
      type: string;
      activeStart: Date;
      activeEnd: Date;
    };
  };
}

/**
 * Options for the useFullCalendarWebMCP hook.
 */
export interface FullCalendarWebMCPOptions {
  calendarRef: RefObject<FullCalendarHandle | null>;
  events: CalendarEventRepository;
  onEventsChanged: () => unknown | Promise<unknown>;
  onRegistrationError?: (error: unknown) => void;
}
