import type { CalendarRef } from "@fullcalendar/react";
import type { RefObject } from "react";
import type {
  CalendarEventRepository,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "../calendar/types";

export interface FullCalendarWebMCPOptions {
  calendarRef: RefObject<CalendarRef | null>;
  events: CalendarEventRepository;
  onEventsChanged: () => void | Promise<void>;
  onRegistrationError?: (error: unknown) => void;
}

type OptionsReader = () => FullCalendarWebMCPOptions;

const emptySchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

const eventProperties = {
  title: {
    type: "string",
    minLength: 1,
    description: "The human-readable event title.",
  },
  start: {
    type: "string",
    format: "date-time",
    description: "Inclusive event start as ISO 8601 with an explicit offset.",
  },
  end: {
    type: ["string", "null"],
    format: "date-time",
    description: "Exclusive event end as ISO 8601 with an explicit offset, or null.",
  },
  allDay: {
    type: "boolean",
    description: "Whether the event is an all-day event.",
  },
} as const;

function readAnnotations(): WebMCP.ToolAnnotations {
  return { readOnlyHint: true, untrustedContentHint: true };
}

function writeAnnotations(): WebMCP.ToolAnnotations {
  return { readOnlyHint: false, untrustedContentHint: true };
}

export function createCalendarTools(
  readOptions: OptionsReader,
): WebMCP.ModelContextTool[] {
  return [
    {
      name: "calendar_get_context",
      title: "Get calendar context",
      description:
        "Get the current time, resolved browser timezone, FullCalendar timezone, visible date range, and active view. Call this before interpreting relative dates such as Wednesday or tomorrow.",
      inputSchema: emptySchema,
      annotations: readAnnotations(),
      async execute() {
        const api = readOptions().calendarRef.current?.getApi();
        return {
          now: new Date().toISOString(),
          browserTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          fullCalendarTimeZone: api?.getOption("timeZone") ?? "local",
          view: api?.view.type ?? null,
          visibleRange: api
            ? {
                start: api.view.activeStart.toISOString(),
                end: api.view.activeEnd.toISOString(),
              }
            : null,
        };
      },
    },
    {
      name: "calendar_list_events",
      title: "List calendar events",
      description:
        "List persisted calendar events, optionally filtered by an inclusive start, exclusive end, or case-insensitive title text. Use an end boundary one day after the requested day.",
      inputSchema: {
        type: "object",
        properties: {
          start: {
            type: "string",
            format: "date-time",
            description: "Inclusive ISO 8601 lower bound.",
          },
          end: {
            type: "string",
            format: "date-time",
            description: "Exclusive ISO 8601 upper bound.",
          },
          text: {
            type: "string",
            description: "Optional case-insensitive title substring.",
          },
        },
        additionalProperties: false,
      },
      annotations: readAnnotations(),
      async execute(
        query: { start?: string; end?: string; text?: string },
        { signal },
      ) {
        const events = await readOptions().events.list(query, { signal });
        return { events };
      },
    },
    {
      name: "calendar_get_event",
      title: "Get calendar event",
      description: "Get one persisted calendar event by its stable event ID.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 1, description: "Stable event ID." },
        },
        required: ["id"],
        additionalProperties: false,
      },
      annotations: readAnnotations(),
      async execute(input, { signal }) {
        const { id } = input as { id: string };
        const event = await readOptions().events.get(id, { signal });
        return { event };
      },
    },
    {
      name: "calendar_create_event",
      title: "Create calendar event",
      description:
        "Create and persist a generic calendar event. Times must be ISO 8601 values with explicit offsets. Returns the host-assigned stable event ID.",
      inputSchema: {
        type: "object",
        properties: eventProperties,
        required: ["title", "start"],
        additionalProperties: false,
      },
      annotations: writeAnnotations(),
      async execute(rawInput, { signal }) {
        const input = rawInput as unknown as CreateCalendarEventInput;
        const options = readOptions();
        const event = await options.events.create(input, { signal });
        await options.onEventsChanged();
        return { event };
      },
    },
    {
      name: "calendar_update_event",
      title: "Update calendar event",
      description:
        "Update selected fields on one persisted calendar event using its stable event ID. Omitted fields remain unchanged.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 1, description: "Stable event ID." },
          ...eventProperties,
        },
        required: ["id"],
        minProperties: 2,
        additionalProperties: false,
      },
      annotations: writeAnnotations(),
      async execute(rawInput, { signal }) {
        const { id, ...input } = rawInput as unknown as UpdateCalendarEventInput & {
          id: string;
        };
        const options = readOptions();
        const event = await options.events.update(id, input, { signal });
        await options.onEventsChanged();
        return { event };
      },
    },
    {
      name: "calendar_delete_event",
      title: "Delete calendar event",
      description: "Delete one persisted calendar event by its stable event ID.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 1, description: "Stable event ID." },
        },
        required: ["id"],
        additionalProperties: false,
      },
      annotations: writeAnnotations(),
      async execute(input, { signal }) {
        const { id } = input as { id: string };
        const options = readOptions();
        await options.events.delete(id, { signal });
        await options.onEventsChanged();
        return { deleted: true, id };
      },
    },
  ];
}
