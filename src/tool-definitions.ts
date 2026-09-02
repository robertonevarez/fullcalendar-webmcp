/// <reference types="webmcp-types" />

import type {
  CalendarEvent,
  CreateCalendarEventInput,
  FullCalendarWebMCPCapabilities,
  FullCalendarWebMCPOptions,
  UpdateCalendarEventInput,
} from "./types";

type OptionsReader = () => FullCalendarWebMCPOptions;

const emptySchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

const stableEventIdProperty = {
  type: "string",
  minLength: 1,
  description:
    "Stable id from calendar_list_events, prior tool results, or host. Never substitute title for id.",
} as const;

const queryStartProperty = {
  type: "string",
  format: "date-time",
  description:
    "Inclusive filter lower bound (ISO 8601 with offset). Omit for no lower limit.",
} as const;

const queryEndProperty = {
  type: "string",
  format: "date-time",
  description:
    "Exclusive filter upper bound (ISO 8601 with offset). One day: following day start. Omit for no limit.",
} as const;

const queryTextProperty = {
  type: "string",
  description:
    "Case-insensitive substring matched against event titles. Omit to skip title filtering.",
} as const;

const createEventTitleProperty = {
  type: "string",
  minLength: 1,
  description: "Display title for the new event.",
} as const;

const updateEventTitleProperty = {
  type: "string",
  minLength: 1,
  description: "New display title. Omit to leave the current title unchanged.",
} as const;

const createEventStartProperty = {
  type: "string",
  format: "date-time",
  description:
    "Inclusive event start (ISO 8601 with offset). Resolve relative times via calendar_get_context first.",
} as const;

const updateEventStartProperty = {
  type: "string",
  format: "date-time",
  description:
    "New inclusive event start (ISO 8601 with explicit offset). Omit to leave the current start unchanged.",
} as const;

const createEventEndProperty = {
  type: ["string", "null"],
  format: "date-time",
  description:
    "Exclusive event end as ISO 8601 date-time with explicit offset, or null for open-ended. Omit on create to use host defaults.",
} as const;

const updateEventEndProperty = {
  type: ["string", "null"],
  format: "date-time",
  description:
    "New exclusive event end (ISO 8601 with explicit offset) or null. Omit to leave the current end unchanged.",
} as const;

const createAllDayProperty = {
  type: "boolean",
  description:
    "Whether the event spans full calendar days without clock times. Defaults to false when omitted.",
} as const;

const updateAllDayProperty = {
  type: "boolean",
  description: "Whether the event is all-day. Omit to leave unchanged.",
} as const;

/** Library-generated viewport/time context — not user-authored event content. */
const contextAnnotations: WebMCP.ToolAnnotations = { readOnlyHint: true };

/** Persisted event reads may include user-controlled titles and host metadata. */
const eventReadAnnotations: WebMCP.ToolAnnotations = {
  readOnlyHint: true,
  untrustedContentHint: true,
};

/** Mutations that return persisted event records with user-controlled fields. */
const eventWriteAnnotations: WebMCP.ToolAnnotations = {
  readOnlyHint: false,
  untrustedContentHint: true,
};

/** Delete returns a pre-removal snapshot with user-controlled fields. */
const deleteAnnotations: WebMCP.ToolAnnotations = {
  readOnlyHint: false,
  untrustedContentHint: true,
};

export function resolveCapabilities(
  capabilities?: FullCalendarWebMCPCapabilities,
): Required<FullCalendarWebMCPCapabilities> {
  return {
    read: capabilities?.read ?? true,
    create: capabilities?.create ?? true,
    update: capabilities?.update ?? true,
    delete: capabilities?.delete ?? true,
  };
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

/** JSON-clone so delete snapshots cannot mutate repository-owned objects. */
function cloneEvent(event: CalendarEvent): CalendarEvent {
  return JSON.parse(JSON.stringify(event)) as CalendarEvent;
}

export function createCalendarTools(
  readOptions: OptionsReader,
): WebMCP.ModelContextTool[] {
  const capabilities = resolveCapabilities(readOptions().capabilities);
  const tools: WebMCP.ModelContextTool[] = [
    {
      name: "calendar_get_context",
      title: "Get calendar context",
      description:
        "Read-only temporal and viewport context for the open calendar — not persisted events. " +
        "Use when the user mentions relative times (today, tomorrow, next week, etc.) to anchor ISO date-times before list/create/update. " +
        "Returns now, browserTimeZone, fullCalendarTimeZone, view, and visibleRange. " +
        "Skip when datetimes are already explicit with offsets. Not for event discovery — use calendar_list_events.",
      inputSchema: emptySchema,
      annotations: contextAnnotations,
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
  ];

  if (capabilities.read) {
    tools.push(
      {
        name: "calendar_list_events",
        title: "List calendar events",
        description:
          "Read-only discovery over persisted events. Find schedules, filter by range or title, disambiguate targets before update/delete. " +
          "Returns events with stable ids for get/update/delete. Prefer calendar_get_event when you have the id; calendar_get_context for viewport only. " +
          "Never mutate or delete from an ambiguous multi-match list.",
        inputSchema: {
          type: "object",
          properties: {
            start: queryStartProperty,
            end: queryEndProperty,
            text: queryTextProperty,
          },
          additionalProperties: false,
        },
        annotations: eventReadAnnotations,
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
          "Read-only fetch of one persisted event by stable id. " +
          "Use when you have the id from calendar_list_events, a prior create/update result, or the host. " +
          "Returns { event } or null when missing. Not for title/date search — use calendar_list_events. Do not invent ids from titles.",
        inputSchema: {
          type: "object",
          properties: {
            id: stableEventIdProperty,
          },
          required: ["id"],
          additionalProperties: false,
        },
        annotations: eventReadAnnotations,
        async execute(input, executeOptions) {
          const { id } = input as { id: string };
          const signal = executionSignal(executeOptions);
          const event = await readOptions().events.get(id, { signal });
          return { event };
        },
      },
    );
  }

  if (capabilities.create) {
    tools.push({
      name: "calendar_create_event",
      title: "Create calendar event",
      description:
        "Create and persist a new event. Requires title and start (ISO 8601 with offset); optional end and allDay. " +
        "Resolve relative times via calendar_get_context first. Returns persisted event with host-assigned id. Metadata cannot be supplied. " +
        "Not for modifying existing events — use calendar_update_event.",
      inputSchema: {
        type: "object",
        properties: {
          title: createEventTitleProperty,
          start: createEventStartProperty,
          end: createEventEndProperty,
          allDay: createAllDayProperty,
        },
        required: ["title", "start"],
        additionalProperties: false,
      },
      annotations: eventWriteAnnotations,
      async execute(rawInput, executeOptions) {
        const input = rawInput as unknown as CreateCalendarEventInput;
        const signal = executionSignal(executeOptions);
        const options = readOptions();
        const event = await options.events.create(input, { signal });
        await options.onEventsChanged();
        return { event };
      },
    });
  }

  if (capabilities.update) {
    tools.push({
      name: "calendar_update_event",
      title: "Update calendar event",
      description:
        "Partial update of one existing event by stable id. Requires id plus at least one of title, start, end, allDay; omitted fields unchanged. " +
        "Host metadata preserved, not writable. Without id, find via calendar_list_events first. " +
        "For reschedule/rename/time changes — not create (calendar_create_event) or delete (calendar_delete_event).",
      inputSchema: {
        type: "object",
        properties: {
          id: stableEventIdProperty,
          title: updateEventTitleProperty,
          start: updateEventStartProperty,
          end: updateEventEndProperty,
          allDay: updateAllDayProperty,
        },
        required: ["id"],
        minProperties: 2,
        additionalProperties: false,
      },
      annotations: eventWriteAnnotations,
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
    });
  }

  if (capabilities.delete) {
    tools.push({
      name: "calendar_delete_event",
      title: "Delete calendar event",
      description:
        "Permanently delete one persisted event by stable id. Obtain id via calendar_list_events after disambiguation; never use title as id or delete from ambiguous lists. " +
        "For removal only — not edit/reschedule (calendar_update_event). Returns { deleted: true, event } pre-delete snapshot.",
      inputSchema: {
        type: "object",
        properties: {
          id: stableEventIdProperty,
        },
        required: ["id"],
        additionalProperties: false,
      },
      annotations: deleteAnnotations,
      async execute(input, executeOptions) {
        const { id } = input as { id: string };
        const signal = executionSignal(executeOptions);
        const options = readOptions();
        const existing = await options.events.get(id, { signal });
        if (existing === null) {
          throw new Error(`Event ${id} was not found.`);
        }
        const snapshot = cloneEvent(existing);
        await options.events.delete(id, { signal });
        await options.onEventsChanged();
        return { deleted: true, event: snapshot };
      },
    });
  }

  return tools;
}
