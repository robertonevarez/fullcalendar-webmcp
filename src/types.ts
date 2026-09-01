import type { RefObject } from "react";

/**
 * JSON-safe primitive values for WebMCP tool boundaries.
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * Recursive JSON-safe value. Intentionally excludes Date, Map, Set, BigInt,
 * functions, undefined, and class instances that are not plain JSON.
 */
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * JSON-safe object used for host-selected, agent-visible event metadata.
 */
export type JsonObject = { [key: string]: JsonValue };

/**
 * Normalized calendar event model.
 *
 * `metadata` is an optional, host-selected, JSON-safe projection for agents.
 * It is read-only at the WebMCP write boundary: create/update inputs never
 * accept metadata. Omission means nothing agent-visible beyond core fields.
 * Protocol Tooling does not automatically expose FullCalendar `extendedProps`.
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  metadata?: JsonObject;
}

/**
 * Input payload for creating a new calendar event.
 * Metadata is intentionally absent — writes remain core fields only.
 */
export interface CreateCalendarEventInput {
  title: string;
  start: string;
  end?: string | null;
  allDay?: boolean;
}

/**
 * Input payload for updating an existing calendar event.
 * Metadata is intentionally absent — writes remain core fields only.
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
 * Controls which WebMCP calendar tools are registered at runtime.
 *
 * Disabled capabilities omit the corresponding tools entirely — they are not
 * registered and cannot be discovered or invoked. This is defense in depth /
 * least-privilege exposure only; the host repository and backend remain
 * authoritative for authorization.
 *
 * `calendar_get_context` is always registered regardless of `read`, because it
 * exposes viewport/timezone context rather than persisted event records.
 */
export interface FullCalendarWebMCPCapabilities {
  /** Register `calendar_list_events` and `calendar_get_event`. Default: true. */
  read?: boolean;
  /** Register `calendar_create_event`. Default: true. */
  create?: boolean;
  /** Register `calendar_update_event`. Default: true. */
  update?: boolean;
  /** Register `calendar_delete_event`. Default: true. */
  delete?: boolean;
}

/**
 * Options for the useFullCalendarWebMCP hook.
 */
export interface FullCalendarWebMCPOptions {
  calendarRef: RefObject<FullCalendarHandle | null>;
  events: CalendarEventRepository;
  onEventsChanged: () => unknown | Promise<unknown>;
  /**
   * Optional least-privilege tool exposure. Omitted fields default to enabled.
   * Does not replace server-side authorization in the host repository/backend.
   */
  capabilities?: FullCalendarWebMCPCapabilities;
  onRegistrationError?: (error: unknown) => void;
}
