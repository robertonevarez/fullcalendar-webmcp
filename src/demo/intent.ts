import { formatDateInZone, timeStringInZone } from '@/lib/time';
import { addDaysToDateString } from '@/demo/format';
import type { WorkingHours } from '@/domain/types';

export interface ParsedCustomerIntent {
  postalCode?: string;
  timePreference?: string;
  /** YYYY-MM-DD in business timezone */
  startDate: string;
  endDate: string;
  /** Free-text used for service search */
  serviceQuery: string;
  /** True when the user appears to confirm a previously offered slot */
  looksLikeConfirmation: boolean;
  /** Parsed clock time if present, e.g. "16:30" */
  chosenTimeHm?: string;
}

function todayInZone(timeZone: string): string {
  return formatDateInZone(new Date(), timeZone);
}

/** "after 4" in booking chat usually means 4pm, not 4am. */
function normalizeAfterBeforePreference(
  kind: 'after' | 'before',
  match: RegExpMatchArray,
): string {
  const hour = Number(match[1]);
  const minute = match[2] ? `:${match[2]}` : '';
  let meridiem = match[3];
  if (!meridiem && hour >= 1 && hour <= 7) {
    meridiem = 'pm';
  }
  return `${kind} ${hour}${minute}${meridiem ? ` ${meridiem}` : ''}`.trim();
}

function weekdayForDateString(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Calendar weekday for a civil date (independent of local TZ interpretation).
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

function nextOpenDate(fromDate: string, hours: WorkingHours[], maxLookahead = 14): string {
  const openDays = new Set(hours.map((h) => h.day));
  for (let i = 0; i < maxLookahead; i += 1) {
    const dateStr = addDaysToDateString(fromDate, i);
    if (openDays.has(weekdayForDateString(dateStr))) return dateStr;
  }
  return fromDate;
}

/**
 * Constrained deterministic intent layer for the guided demo.
 * Interprets natural language; does not invent business results.
 */
export function parseCustomerIntent(
  message: string,
  options: {
    timeZone: string;
    workingHours: WorkingHours[];
  },
): ParsedCustomerIntent {
  const text = message.trim();
  const lower = text.toLowerCase();

  const postalMatch = text.match(/\b(\d{5})\b/);
  const postalCode = postalMatch?.[1];

  let timePreference: string | undefined;
  const afterMatch = lower.match(/\bafter\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  const beforeMatch = lower.match(/\bbefore\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (afterMatch) {
    timePreference = normalizeAfterBeforePreference('after', afterMatch);
  } else if (beforeMatch) {
    timePreference = normalizeAfterBeforePreference('before', beforeMatch);
  } else if (/\bmorning\b/.test(lower)) {
    timePreference = 'morning';
  } else if (/\bafternoon\b/.test(lower)) {
    timePreference = 'afternoon';
  }

  const today = todayInZone(options.timeZone);
  let startDate = today;
  if (/\btomorrow\b/.test(lower)) {
    startDate = addDaysToDateString(today, 1);
  } else if (/\btoday\b/.test(lower)) {
    startDate = today;
  }

  // If the requested day is closed, move to the next open day (demo UX).
  startDate = nextOpenDate(startDate, options.workingHours);
  const endDate = startDate;

  const chosenTime = parseSpokenTime(lower);

  const confirmationHints =
    /\b(works|book|yes|confirm|that one|first one|go ahead|sounds good|perfect)\b/.test(lower) ||
    Boolean(chosenTime && /\b(works|book|yes|please|confirm|pm|am)\b/.test(lower));

  // Strip location/time noise for service search; keep symptom words.
  const serviceQuery = text
    .replace(/\b\d{5}\b/g, ' ')
    .replace(/\b(tomorrow|today|after|before|morning|afternoon|am|pm|i'?m|free|in)\b/gi, ' ')
    .replace(/\b\d{1,2}(:\d{2})?\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    postalCode,
    timePreference,
    startDate,
    endDate,
    serviceQuery: serviceQuery || text,
    looksLikeConfirmation: confirmationHints && text.length < 120,
    chosenTimeHm: chosenTime,
  };
}

/** Convert "4:30", "4:30pm", "4 pm" → "HH:mm" 24h. */
export function parseSpokenTime(lower: string): string | undefined {
  const withMinutes = lower.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/);
  if (withMinutes) {
    let hour = Number(withMinutes[1]);
    const minute = Number(withMinutes[2]);
    const meridiem = withMinutes[3];
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    if (!meridiem && hour > 0 && hour <= 7) hour += 12;
    if (hour > 23 || minute > 59) return undefined;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  const hourOnly = lower.match(/\b(\d{1,2})\s*(am|pm)\b/);
  if (hourOnly) {
    let hour = Number(hourOnly[1]);
    const meridiem = hourOnly[2];
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    if (hour > 23) return undefined;
    return `${String(hour).padStart(2, '0')}:00`;
  }

  return undefined;
}

export function matchSlotBySpokenTime(
  slots: { starts_at: string }[],
  chosenHm: string | undefined,
  timeZone: string,
): number {
  if (!chosenHm) return -1;
  return slots.findIndex((slot) => timeStringInZone(new Date(slot.starts_at), timeZone) === chosenHm);
}
