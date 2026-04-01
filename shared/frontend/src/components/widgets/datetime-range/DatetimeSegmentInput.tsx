/**
 * DatetimeSegmentInput
 *
 * Segmented date-time input: [YYYY]-[MM]-[DD] [HH]:[mm]:[ss]
 *
 * - Click or Tab to focus individual segments
 * - Type digits → auto-advance when segment is full
 * - Arrow Up/Down → increment/decrement
 * - Backspace → clear segment
 * - Calls onChange with a new Date when any segment commits
 */
import React, { useRef, useState, useMemo, useCallback } from 'react';
import { cn } from '../../../lib/utils';

interface Segment {
  key: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';
  min: number;
  max: number;
  digits: number;
  label: string;
}

const SEGMENTS: Segment[] = [
  { key: 'year',   min: 1900, max: 2099, digits: 4, label: 'YYYY' },
  { key: 'month',  min: 1,    max: 12,   digits: 2, label: 'MM'   },
  { key: 'day',    min: 1,    max: 31,   digits: 2, label: 'DD'   },
  { key: 'hour',   min: 0,    max: 23,   digits: 2, label: 'HH'   },
  { key: 'minute', min: 0,    max: 59,   digits: 2, label: 'mm'   },
  { key: 'second', min: 0,    max: 59,   digits: 2, label: 'ss'   },
];

type SegmentKey = Segment['key'];

function getSegmentValue(date: Date, key: SegmentKey): number {
  switch (key) {
    case 'year':   return date.getFullYear();
    case 'month':  return date.getMonth() + 1;
    case 'day':    return date.getDate();
    case 'hour':   return date.getHours();
    case 'minute': return date.getMinutes();
    case 'second': return date.getSeconds();
  }
}

function applySegment(date: Date, key: SegmentKey, value: number): Date {
  const d = new Date(date);
  switch (key) {
    case 'year':   d.setFullYear(value); break;
    case 'month':  d.setMonth(value - 1); break;
    case 'day':    d.setDate(value); break;
    case 'hour':   d.setHours(value); break;
    case 'minute': d.setMinutes(value); break;
    case 'second': d.setSeconds(value); break;
  }
  return d;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface DatetimeSegmentInputProps {
  value: Date;
  onChange: (date: Date) => void;
  disabled?: boolean;
  className?: string;
  isError?: boolean;
}

export function DatetimeSegmentInput({
  value,
  onChange,
  disabled = false,
  className,
  isError = false,
}: DatetimeSegmentInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spanRefs = useRef<Record<SegmentKey, HTMLDivElement | null>>({
    year: null, month: null, day: null,
    hour: null, minute: null, second: null,
  });

  // Partial typing buffer per segment: null = not currently typing
  const [typing, setTyping] = useState<Record<SegmentKey, string | null>>({
    year: null, month: null, day: null,
    hour: null, minute: null, second: null,
  });

  // Sync display when value changes externally (e.g. calendar pick)
  const date = useMemo(
    () => (!Number.isNaN(value.getTime()) ? value : new Date()),
    [value],
  );

  const focusSegment = useCallback((key: SegmentKey) => {
    spanRefs.current[key]?.focus();
  }, []);

  const commitTyping = useCallback((key: SegmentKey, buf: string) => {
    const num = parseInt(buf, 10);
    const seg = SEGMENTS.find(s => s.key === key)!;
    if (!Number.isNaN(num)) {
      const clamped = clamp(num, seg.min, seg.max);
      onChange(applySegment(date, key, clamped));
    }
    setTyping(prev => ({ ...prev, [key]: null }));
  }, [date, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLSpanElement>, seg: Segment) => {
    if (disabled) return;
    const { key } = seg;
    const idx = SEGMENTS.findIndex(s => s.key === key);
    const cur = typing[key];

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      // Flush any partial typing first
      if (cur !== null) {
        commitTyping(key, cur);
      }
      const delta = e.key === 'ArrowUp' ? 1 : -1;
      const current = getSegmentValue(date, key);
      const next = clamp(current + delta, seg.min, seg.max);
      onChange(applySegment(date, key, next));
      return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      if (cur !== null) commitTyping(key, cur);
      if (idx > 0) focusSegment(SEGMENTS[idx - 1].key);
      return;
    }

    if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      if (cur !== null) commitTyping(key, cur);
      if (idx < SEGMENTS.length - 1) focusSegment(SEGMENTS[idx + 1].key);
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      setTyping(prev => ({ ...prev, [key]: null }));
      return;
    }

    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const next = (cur === null ? '' : cur) + e.key;

      if (next.length >= seg.digits) {
        // Segment complete — commit and advance
        commitTyping(key, next);
        if (idx < SEGMENTS.length - 1) {
          // small delay so focus happens after state flush
          setTimeout(() => focusSegment(SEGMENTS[idx + 1].key), 0);
        }
      } else {
        setTyping(prev => ({ ...prev, [key]: next }));
      }
      return;
    }
  }, [disabled, typing, date, onChange, commitTyping, focusSegment]);

  const handleBlur = useCallback((key: SegmentKey) => {
    const buf = typing[key];
    if (buf !== null) {
      commitTyping(key, buf);
    }
  }, [typing, commitTyping]);

  const displayValue = (seg: Segment): string => {
    const buf = typing[seg.key];
    if (buf !== null) return buf.padStart(seg.digits, '_').slice(-seg.digits);
    const val = getSegmentValue(date, seg.key);
    return String(val).padStart(seg.digits, '0');
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'inline-flex h-8 px-2.5 border border-input bg-transparent text-xs transition-colors',
        'focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50 items-center',
        isError && 'border-destructive ring-1 ring-destructive/20',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none bg-input/50',
        className,
      )}
      onMouseDown={(e) => {
        // Only intercept clicks on separators (span) — let segment divs focus naturally
        const target = e.target as HTMLElement;
        if (target.tagName === 'SPAN') {
          e.preventDefault();
          focusSegment('hour');
        }
      }}
    >
      {SEGMENTS.map((seg, idx) => {
        const sep = idx === 0 ? null : idx === 3 ? '\u00a0' : idx < 3 ? '-' : ':';
        const isFocused = typing[seg.key] !== null;
        return (
          <React.Fragment key={seg.key}>
            {sep !== null && (
              <span className="text-muted-foreground select-none items-center" aria-hidden>{sep}</span>
            )}
            <div
              ref={(el) => { spanRefs.current[seg.key] = el; }}
              role="spinbutton"
              aria-label={seg.label}
              aria-valuenow={getSegmentValue(date, seg.key)}
              aria-valuemin={seg.min}
              aria-valuemax={seg.max}
              tabIndex={disabled ? -1 : 0}
              className={cn(
                'outline-none rounded-sm px-1 h-6 grid place-items-center leading-none cursor-default select-none',
                'focus:bg-primary focus:text-primary-foreground',
                isFocused && 'bg-primary/20',
              )}
              onKeyDown={(e) => handleKeyDown(e, seg)}
              onBlur={() => handleBlur(seg.key)}
            >
              {displayValue(seg)}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
