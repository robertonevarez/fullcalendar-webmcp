import type {
  CalendarEvent,
  CalendarEventQuery,
  CalendarEventRepository,
  CreateCalendarEventInput,
  JsonObject,
  UpdateCalendarEventInput,
} from "../../src";

const STORAGE_KEY = "protocol-tooling:calendar-events:v1";

interface RepositoryOptions {
  storage?: Pick<Storage, "getItem" | "setItem">;
  storageKey?: string;
  seedEvents?: CalendarEvent[];
  createId?: () => string;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertActive(signal?: AbortSignal) {
  signal?.throwIfAborted();
}

function normalizeEvent(
  id: string,
  input: CreateCalendarEventInput,
  existingMetadata?: CalendarEvent["metadata"],
): CalendarEvent {
  if (!input.title.trim()) {
    throw new Error("Event title cannot be empty.");
  }

  const start = new Date(input.start);
  const end = input.end ? new Date(input.end) : null;
  if (Number.isNaN(start.valueOf()) || (end && Number.isNaN(end.valueOf()))) {
    throw new Error("Event start and end must be valid ISO 8601 values.");
  }
  if (end && end <= start) {
    throw new Error("Event end must be after its start.");
  }

  const event: CalendarEvent = {
    id,
    title: input.title.trim(),
    start: start.toISOString(),
    end: end?.toISOString() ?? null,
    allDay: input.allDay ?? false,
  };

  // Preserve repository-owned metadata across core-field updates.
  // Create/update inputs never carry metadata (read-only projection).
  if (existingMetadata !== undefined) {
    event.metadata = clone(existingMetadata) as JsonObject;
  }

  return event;
}

export class LocalCalendarEventRepository implements CalendarEventRepository {
  private readonly storage: Pick<Storage, "getItem" | "setItem">;
  private readonly storageKey: string;
  private readonly seedEvents: CalendarEvent[];
  private readonly createId: () => string;
  private memoryFallback: CalendarEvent[] | null = null;

  constructor(options: RepositoryOptions = {}) {
    this.storage = options.storage ?? window.localStorage;
    this.storageKey = options.storageKey ?? STORAGE_KEY;
    this.seedEvents = clone(options.seedEvents ?? []);
    this.createId = options.createId ?? (() => crypto.randomUUID());
  }

  async list(
    query: CalendarEventQuery = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<CalendarEvent[]> {
    assertActive(options.signal);
    const start = query.start ? new Date(query.start) : null;
    const end = query.end ? new Date(query.end) : null;
    const text = query.text?.trim().toLocaleLowerCase();

    const events = this.read().filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = event.end ? new Date(event.end) : eventStart;
      const overlapsStart =
        !start || (event.end ? eventEnd > start : eventStart >= start);
      const overlapsEnd = !end || eventStart < end;
      const matchesText = !text || event.title.toLocaleLowerCase().includes(text);
      return overlapsStart && overlapsEnd && matchesText;
    });

    assertActive(options.signal);
    return clone(events);
  }

  async get(
    id: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<CalendarEvent | null> {
    assertActive(options.signal);
    const event = this.read().find((candidate) => candidate.id === id) ?? null;
    return clone(event);
  }

  async create(
    input: CreateCalendarEventInput,
    options: { signal?: AbortSignal } = {},
  ): Promise<CalendarEvent> {
    assertActive(options.signal);
    const event = normalizeEvent(this.createId(), input);
    const events = this.read();
    this.write([...events, event]);
    return clone(event);
  }

  async update(
    id: string,
    input: UpdateCalendarEventInput,
    options: { signal?: AbortSignal } = {},
  ): Promise<CalendarEvent> {
    assertActive(options.signal);
    const events = this.read();
    const index = events.findIndex((event) => event.id === id);
    if (index === -1) {
      throw new Error(`Event ${id} was not found.`);
    }

    const updated = normalizeEvent(
      id,
      {
        title: input.title ?? events[index]!.title,
        start: input.start ?? events[index]!.start,
        end: input.end === undefined ? events[index]!.end : input.end,
        allDay: input.allDay ?? events[index]!.allDay,
      },
      events[index]!.metadata,
    );
    events[index] = updated;
    this.write(events);
    return clone(updated);
  }

  async delete(
    id: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<void> {
    assertActive(options.signal);
    const events = this.read();
    const remaining = events.filter((event) => event.id !== id);
    if (remaining.length === events.length) {
      throw new Error(`Event ${id} was not found.`);
    }
    this.write(remaining);
  }

  private read(): CalendarEvent[] {
    if (this.memoryFallback) return clone(this.memoryFallback);

    try {
      const stored = this.storage.getItem(this.storageKey);
      if (stored) return JSON.parse(stored) as CalendarEvent[];
      try {
        this.write(this.seedEvents);
      } catch {
        this.memoryFallback = clone(this.seedEvents);
      }
      return clone(this.seedEvents);
    } catch {
      this.memoryFallback = clone(this.seedEvents);
      return clone(this.memoryFallback);
    }
  }

  private write(events: CalendarEvent[]) {
    const value = clone(events);
    this.storage.setItem(this.storageKey, JSON.stringify(value));
    this.memoryFallback = null;
  }
}
