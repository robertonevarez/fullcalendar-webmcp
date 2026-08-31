export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
}

export interface CreateCalendarEventInput {
  title: string;
  start: string;
  end?: string | null;
  allDay?: boolean;
}

export interface UpdateCalendarEventInput {
  title?: string;
  start?: string;
  end?: string | null;
  allDay?: boolean;
}

export interface CalendarEventQuery {
  start?: string;
  end?: string;
  text?: string;
}

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
