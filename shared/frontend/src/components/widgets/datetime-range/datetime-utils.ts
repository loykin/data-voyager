import * as chrono from 'chrono-node';
import { DateTimeRangeValue, DateTimeRelativeFormat, ValidationErrorType, QuickPreset } from './types';

export const RELATIVE_FORMATS: DateTimeRelativeFormat[] = [
  'Seconds ago',
  'Minutes ago',
  'Hours ago',
  'Days ago',
  'Weeks ago',
  'Months ago',
];

export const QUICK_PRESETS: QuickPreset[] = [
  { label: 'Last 5 minutes',  start: { type: 'relative', relativeValue: '5',  relativeFormat: 'Minutes ago' }, end: { type: 'relative', relativeNow: true } },
  { label: 'Last 15 minutes', start: { type: 'relative', relativeValue: '15', relativeFormat: 'Minutes ago' }, end: { type: 'relative', relativeNow: true } },
  { label: 'Last 30 minutes', start: { type: 'relative', relativeValue: '30', relativeFormat: 'Minutes ago' }, end: { type: 'relative', relativeNow: true } },
  { label: 'Last 1 hour',     start: { type: 'relative', relativeValue: '1',  relativeFormat: 'Hours ago' },   end: { type: 'relative', relativeNow: true } },
  { label: 'Last 3 hours',    start: { type: 'relative', relativeValue: '3',  relativeFormat: 'Hours ago' },   end: { type: 'relative', relativeNow: true } },
  { label: 'Last 6 hours',    start: { type: 'relative', relativeValue: '6',  relativeFormat: 'Hours ago' },   end: { type: 'relative', relativeNow: true } },
  { label: 'Last 12 hours',   start: { type: 'relative', relativeValue: '12', relativeFormat: 'Hours ago' },   end: { type: 'relative', relativeNow: true } },
  { label: 'Last 24 hours',   start: { type: 'relative', relativeValue: '24', relativeFormat: 'Hours ago' },   end: { type: 'relative', relativeNow: true } },
  { label: 'Last 2 days',     start: { type: 'relative', relativeValue: '2',  relativeFormat: 'Days ago' },    end: { type: 'relative', relativeNow: true } },
  { label: 'Last 7 days',     start: { type: 'relative', relativeValue: '7',  relativeFormat: 'Days ago' },    end: { type: 'relative', relativeNow: true } },
  { label: 'Last 30 days',    start: { type: 'relative', relativeValue: '30', relativeFormat: 'Days ago' },    end: { type: 'relative', relativeNow: true } },
  { label: 'Last 90 days',    start: { type: 'relative', relativeValue: '90', relativeFormat: 'Days ago' },    end: { type: 'relative', relativeNow: true } },
  { label: 'Last 6 months',   start: { type: 'relative', relativeValue: '6',  relativeFormat: 'Months ago' },  end: { type: 'relative', relativeNow: true } },
  { label: 'Last 1 year',     start: { type: 'relative', relativeValue: '12', relativeFormat: 'Months ago' },  end: { type: 'relative', relativeNow: true } },
];

/** Converts a DateTimeRangeValue to a Date object. */
export function toDate(value: DateTimeRangeValue): Date {
  if (value.type === 'absolute') {
    if (value.absoluteValue instanceof Date) return value.absoluteValue;
    if (value.absoluteValue) return new Date(value.absoluteValue);
    return new Date();
  }

  if (value.relativeNow) return new Date();

  let relStr: string;
  if (value.relativeFormat) {
    relStr = `${value.relativeValue} ${value.relativeFormat}`;
  } else {
    relStr = String(value.relativeValue ?? '');
  }

  const parsed = chrono.parseDate(relStr);
  return parsed ?? new Date();
}

/** Converts a DateTimeRangeValue to Unix timestamp in milliseconds. */
export function toTimestampMs(value: DateTimeRangeValue): number {
  return toDate(value).getTime();
}

/** Converts a DateTimeRangeValue to Unix timestamp in seconds. */
export function toTimestamp(value: DateTimeRangeValue): number {
  return Math.floor(toTimestampMs(value) / 1000);
}

/** Formats a DateTimeRangeValue for display in the trigger button. */
export function toDisplayString(value: DateTimeRangeValue): string {
  if (value.type === 'absolute') {
    return value.absoluteValue
      ? value.absoluteValue.toLocaleString(navigator.language, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : 'None';
  }

  if (value.relativeNow) return 'now';
  return `${value.relativeValue ?? ''}${value.relativeFormat ? ' ' + value.relativeFormat : ''}`;
}

/**
 * Converts a DateTimeRangeValue to a Grafana-compatible URL string.
 * @example
 * toUrlString({ type: 'relative', relativeNow: true })           // "now"
 * toUrlString({ type: 'relative', relativeValue: '5', relativeFormat: 'Minutes ago' }) // "now-5m"
 * toUrlString({ type: 'absolute', absoluteValue: new Date() })   // "1709654400000"
 */
export function toUrlString(value: DateTimeRangeValue): string {
  if (value.type === 'absolute') {
    const date = value.absoluteValue instanceof Date
      ? value.absoluteValue
      : value.absoluteValue ? new Date(value.absoluteValue) : new Date();
    return date.getTime().toString();
  }

  if (value.relativeNow) return 'now';

  if (typeof value.relativeValue === 'string' && !value.relativeFormat) {
    return value.relativeValue.startsWith('now') ? value.relativeValue : `now${value.relativeValue}`;
  }

  const unitMap: Record<string, string> = {
    'Seconds ago': 's', 'Minutes ago': 'm', 'Hours ago': 'h',
    'Days ago': 'd', 'Weeks ago': 'w', 'Months ago': 'M', 'Years ago': 'y',
  };
  const unit = value.relativeFormat ? unitMap[value.relativeFormat] : 'h';
  const amount = value.relativeValue ?? 1;
  return `now-${amount}${unit}`;
}

/**
 * Parses a Grafana-compatible URL string into a DateTimeRangeValue.
 * @example
 * fromUrlString("now")      // { type: 'relative', relativeNow: true }
 * fromUrlString("now-5m")   // { type: 'relative', relativeValue: '5', relativeFormat: 'Minutes ago' }
 * fromUrlString("1234567890000") // { type: 'absolute', absoluteValue: Date }
 */
export function fromUrlString(urlString: string): DateTimeRangeValue {
  if (urlString === 'now') return { type: 'relative', relativeNow: true };

  if (urlString.startsWith('now')) {
    const match = urlString.match(/^now([+-]?)(\d+)([smhdwMy])$/);
    if (match) {
      const [, sign, amount, unit] = match;
      const unitToFormat: Record<string, DateTimeRelativeFormat> = {
        s: 'Seconds ago', m: 'Minutes ago', h: 'Hours ago',
        d: 'Days ago', w: 'Weeks ago', M: 'Months ago', y: 'Years ago',
      };
      const relativeFormat = unitToFormat[unit];
      if (relativeFormat && sign !== '+') {
        return { type: 'relative', relativeValue: amount, relativeFormat, relativeNow: false };
      }
      return { type: 'relative', relativeValue: `${sign}${amount}${unit}`, relativeNow: false };
    }
    return { type: 'relative', relativeNow: true };
  }

  const timestamp = parseInt(urlString, 10);
  if (!isNaN(timestamp)) return { type: 'absolute', absoluteValue: new Date(timestamp) };

  return { type: 'relative', relativeNow: true };
}

/** Creates a relative "now" value. */
export function relativeNow(): DateTimeRangeValue {
  return { type: 'relative', relativeNow: true };
}

/** Creates a relative value like "5 Minutes ago". */
export function relativeAgo(value: number, format: DateTimeRelativeFormat): DateTimeRangeValue {
  return { type: 'relative', relativeValue: String(value), relativeFormat: format };
}

/** Creates an absolute value from a Date. */
export function absoluteDate(date: Date): DateTimeRangeValue {
  return { type: 'absolute', absoluteValue: date };
}

/** Validates that start < end. Returns error message or null. */
export function validateRange(
  start: DateTimeRangeValue,
  end: DateTimeRangeValue,
): ValidationErrorType {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (startDate >= endDate) return 'validation';
  return null;
}
