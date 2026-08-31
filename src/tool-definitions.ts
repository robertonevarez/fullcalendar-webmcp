/// <reference types="webmcp-types" />

import type {
  CreateCalendarEventInput,
  FullCalendarWebMCPOptions,
  UpdateCalendarEventInput,
} from "./types";

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

/**
 * WebMCP imperative execute steps always pass ToolExecuteCallbackOptions with a
 * fresh AbortSignal. Some agent shims still call execute(input) with one argument.
 * Never require-destructure options; forward signal when present.
 */
function executionSignal(
  executeOptions: WebMCP.ToolExecuteCallbackOptions | undefined,
): AbortSignal | undefined {
  return executeOptions?.signal;
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
        "List persisted calendar events, optionally filtered by an inclusive start, exclusive end, or case-insensitive title text. Use an end boundary one day after the requested day. Events may include optional host-selected metadata (JSON object) for agent context; Protocol Tooling does not automatically expose FullCalendar extendedProps.",
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
      async execute(query, executeOptions) {
        const signal = executionSignal(executeOptions);
        const events = await readOptions().events.list(
          query as { start?: string; end?: string; text?: string },
          { signal },
        );
        return { events };
      },
    },
    {
      name: "calendar_get_event",
      title: "Get calendar event",
      description:
        "Get one persisted calendar event by its stable event ID. The event may include optional host-selected metadata (JSON object) for agent context; metadata is read-only and is never inferred from FullCalendar extendedProps.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 1, description: "Stable event ID." },
        },
        required: ["id"],
        additionalProperties: false,
      },
      annotations: readAnnotations(),
      async execute(input, executeOptions) {
        const { id } = input as { id: string };
        const signal = executionSignal(executeOptions);
        const event = await readOptions().events.get(id, { signal });
        return { event };
      },
    },
    {
      name: "calendar_create_event",
      title: "Create calendar event",
      description:
        "Create and persist a generic calendar event. Times must be ISO 8601 values with explicit offsets. Returns the host-assigned stable event ID. Metadata cannot be supplied on create; only title, start, end, and allDay are accepted.",
      inputSchema: {
        type: "object",
        properties: eventProperties,
        required: ["title", "start"],
        additionalProperties: false,
      },
      annotations: writeAnnotations(),
      async execute(rawInput, executeOptions) {
        const input = rawInput as unknown as CreateCalendarEventInput;
        const signal = executionSignal(executeOptions);
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
        "Update selected fields on one persisted calendar event using its stable event ID. Omitted fields remain unchanged. Metadata cannot be supplied on update; only title, start, end, and allDay may be changed. Host-owned metadata is preserved by the repository.",
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
      async execute(rawInput, executeOptions) {
        const { id, ...input } = rawInput as unknown as UpdateCalendarEventInput & {
          id: string;
        };
        const signal = executionSignal(executeOptions);
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
      async execute(input, executeOptions) {
        const { id } = input as { id: string };
        const signal = executionSignal(executeOptions);
        const options = readOptions();
        await options.events.delete(id, { signal });
        await options.onEventsChanged();
        return { deleted: true, id };
      },
    },
  ];
}
