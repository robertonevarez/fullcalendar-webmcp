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
    "Stable id of the persisted event. Obtain from calendar_list_events, calendar_get_event, or a prior create/update result. Never substitute an event title.",
} as const;

const queryStartProperty = {
  type: "string",
  format: "date-time",
  description:
    "Inclusive lower bound for filtering persisted events (ISO 8601 date-time with explicit offset). Omit to include events from any earlier time.",
} as const;

const queryEndProperty = {
  type: "string",
  format: "date-time",
  description:
    "Exclusive upper bound for filtering persisted events (ISO 8601 date-time with explicit offset). For one calendar day, set end to the start of the following day. Omit for no upper limit.",
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
    "Inclusive event start as ISO 8601 date-time with an explicit offset (e.g. 2026-09-02T14:00:00-06:00). Resolve relative times with calendar_get_context first.",
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

/** Destructive mutation with a minimal structured confirmation payload. */
const deleteAnnotations: WebMCP.ToolAnnotations = { readOnlyHint: false };

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
        "Use when the user mentions relative times (today, tomorrow, tonight, Wednesday, next week, this afternoon, first week of next month) to anchor ISO date-times before list/create/update. " +
        "Returns now, browserTimeZone, fullCalendarTimeZone, active view, and visibleRange. " +
        "Skip when every datetime is already explicit with offsets and no relative interpretation is needed. " +
        "Does not replace calendar_list_events for event discovery.",
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
          "Read-only search and discovery over persisted calendar events. " +
          "Use to answer what is scheduled, filter by date range or title, find candidate events before update/delete, or disambiguate which event the user means. " +
          "start is inclusive; end is exclusive — for one calendar day set end to the following day's boundary. " +
          "text is a case-insensitive title substring; omit any filter to broaden results. " +
          "Returns events with stable id values usable in get/update/delete; optional host-selected metadata may appear and is untrusted. " +
          "Do not use when you already hold the target id (prefer calendar_get_event) or only need viewport/time context (calendar_get_context). " +
          "Never delete or mutate from an ambiguous multi-match list alone.",
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
          "Read-only fetch of exactly one persisted event by stable id. " +
          "Use when you already have the id from calendar_list_events, a prior create/update result, or the host app — or to re-read authoritative fields before a mutation when list results are insufficient. " +
          "Returns { event: CalendarEvent | null }; null means no matching persisted event. " +
          "Do not use for title/date search (calendar_list_events), do not invent ids from titles, and do not substitute a title for id.",
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
        "Create and persist a new calendar event (state mutation). " +
        "Use only for brand-new events the user wants scheduled. " +
        "Requires title and start (ISO 8601 with explicit offset); optional end (exclusive, ISO 8601 or null) and allDay. " +
        "Resolve relative times via calendar_get_context first. " +
        "Returns the persisted event including host-assigned id. Metadata cannot be supplied. " +
        "Do not use to modify, reschedule, or rename an existing event — use calendar_update_event.",
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
        "Persisted partial update of exactly one existing event (state mutation). " +
        "Requires stable id plus at least one of title, start, end, allDay; omitted fields stay unchanged. " +
        "Host-selected metadata is preserved and cannot be written here. " +
        "When the user names an event without an id, find it with calendar_list_events first; calendar_get_event is optional if the list row already has sufficient detail. " +
        "Use for reschedule, rename, time/end changes, or all-day toggles — not for creating a duplicate or deleting (calendar_create_event / calendar_delete_event).",
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
        "Permanently delete exactly one persisted calendar event (destructive state mutation). " +
        "Requires stable id — obtain via calendar_list_events after disambiguating natural-language references; never pass a title as id and never delete from an ambiguous multi-match list. " +
        "Use only when the user intends removal/cancellation, not to move, rename, shorten, or otherwise edit (calendar_update_event). " +
        "Returns { deleted: true, event } where event is the deleted resource snapshot read immediately before removal.",
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
