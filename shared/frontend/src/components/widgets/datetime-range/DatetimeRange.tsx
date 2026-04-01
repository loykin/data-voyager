import React, { useState, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Switch } from '../../ui/switch';
import { Separator } from '../../ui/separator';
import { DateTimePanel } from './DatetimePanel';
import { DatetimeSegmentInput } from './DatetimeSegmentInput';
import {
  DateTimeRangeValue,
  DateTimeRelativeFormat,
  ValidationErrorType,
  QuickPreset,
} from './types';
import {
  toDate,
  toDisplayString,
  validateRange,
  absoluteDate,
  RELATIVE_FORMATS,
  QUICK_PRESETS,
} from './datetime-utils';

// ─── RelativeSidePanel ────────────────────────────────────────────────────────
// Inline relative time picker (no Cancel/Done — handled by outer Apply button).

interface RelativeSidePanelProps {
  value: DateTimeRangeValue;
  onChange: (value: DateTimeRangeValue) => void;
}

function RelativeSidePanel({ value, onChange }: RelativeSidePanelProps) {
  const [numValue, setNumValue] = useState<string>(
    value.relativeValue !== undefined ? String(value.relativeValue) : '5',
  );
  const [format, setFormat] = useState<DateTimeRelativeFormat>(
    value.relativeFormat ?? 'Minutes ago',
  );
  const [isNow, setIsNow] = useState<boolean>(value.relativeNow ?? false);

  // Sync up when the preset quick-select changes the value from outside.
  useEffect(() => {
    if (value.relativeNow) {
      setIsNow(true);
    } else {
      setIsNow(false);
      if (value.relativeValue !== undefined) setNumValue(String(value.relativeValue));
      if (value.relativeFormat) setFormat(value.relativeFormat);
    }
  }, [value]);

  const emit = (next: { numValue: string; format: DateTimeRelativeFormat; isNow: boolean }) => {
    if (next.isNow) {
      onChange({ type: 'relative', relativeNow: true });
    } else {
      onChange({
        type: 'relative',
        relativeValue: next.numValue,
        relativeFormat: next.format,
        relativeNow: false,
      });
    }
  };

  return (
    <div className="flex flex-col gap-3 mt-3">
      <div>
        <p className="text-[11px] text-muted-foreground mb-1.5">Amount</p>
        <div className="flex flex-row gap-1.5">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="h-8 w-20 text-xs"
            disabled={isNow}
            value={numValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const val = e.target.value;
              if (/^\d*$/.test(val)) {
                setNumValue(val);
                emit({ numValue: val, format, isNow });
              }
            }}
            onWheel={(e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur()}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
            }}
          />
          <Select
            disabled={isNow}
            value={format}
            onValueChange={(v) => {
              const f = v as DateTimeRelativeFormat;
              setFormat(f);
              emit({ numValue, format: f, isNow });
            }}
          >
            <SelectTrigger className="h-8 text-xs text-left leading-tight">
              <SelectValue>{format}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {RELATIVE_FORMATS.map((f) => (
                <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-row gap-2 items-center pt-0.5">
        <Switch
          checked={isNow}
          onCheckedChange={(checked: boolean) => {
            setIsNow(checked);
            emit({ numValue, format, isNow: checked });
          }}
        />
        <div className="flex flex-col">
          <label className="text-xs font-medium">Now</label>
          <span className="text-[11px] text-muted-foreground">Set to current time</span>
        </div>
      </div>
    </div>
  );
}

// ─── SidePanel ────────────────────────────────────────────────────────────────
// One side (Start or End) inside the combined popover.

interface SidePanelProps {
  title: string;
  value: DateTimeRangeValue;
  compareValue?: DateTimeRangeValue;
  onChange: (value: DateTimeRangeValue) => void;
}

function SidePanel({ title, value, compareValue, onChange }: SidePanelProps) {
  const compareDate = compareValue ? toDate(compareValue) : undefined;
  const [calendarVisible, setCalendarVisible] = useState(false);

  const absoluteDate_ = value.type === 'absolute' ? toDate(value) : new Date();

  useEffect(() => {
    if (value.type !== 'absolute') {
      setCalendarVisible(false);
    }
  }, [value.type]);

  return (
    <div className="flex flex-col w-[268px]">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest pb-2">
        {title}
      </p>

      <Tabs
        value={value.type}
        className="flex-col"
        onValueChange={(t: string) => {
          setCalendarVisible(false);
          if (t === 'absolute') {
            onChange(absoluteDate(absoluteDate_));
          } else {
            onChange({ type: 'relative', relativeValue: '5', relativeFormat: 'Minutes ago' });
          }
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="absolute">Absolute</TabsTrigger>
          <TabsTrigger value="relative">Relative</TabsTrigger>
        </TabsList>

        {/* ── Absolute tab ─────────────────────────────── */}
        <TabsContent value="absolute">
          <div className="flex flex-col gap-1.5 mt-3">
            <div className="flex items-center gap-1.5">
              <DatetimeSegmentInput
                value={absoluteDate_}
                onChange={(d) => onChange(absoluteDate(d))}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn('h-8 w-8 shrink-0', calendarVisible && 'bg-accent border-foreground')}
                onClick={() => setCalendarVisible(v => !v)}
                title="Pick from calendar"
              >
                <CalendarDays size={14} />
              </Button>
            </div>
            {/* Calendar inline — same DOM tree as outer popover, no focus/click interception issues */}
            {calendarVisible && (
              <div className="border-t pt-2 mt-1">
                <DateTimePanel
                  value={value.type === 'absolute' ? toDate(value) : undefined}
                  compareValue={compareDate}
                  title={title}
                  immediate
                  onChangeAction={(d) => {
                    if (!d) return;
                    onChange(absoluteDate(d));
                  }}
                />
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Relative tab ─────────────────────────────── */}
        <TabsContent value="relative">
          <RelativeSidePanel value={value} onChange={onChange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── DatetimeRange ────────────────────────────────────────────────────────────

export interface DatetimeRangeProps {
  startTime: DateTimeRangeValue;
  endTime: DateTimeRangeValue;
  onChange: (startTime: DateTimeRangeValue, endTime: DateTimeRangeValue) => void;
  /** Override the list of quick presets shown in the left panel. */
  quickPresets?: QuickPreset[];
  className?: string;
}

export function DatetimeRange({
  startTime,
  endTime,
  onChange,
  quickPresets = QUICK_PRESETS,
  className,
}: DatetimeRangeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftStart, setDraftStart] = useState<DateTimeRangeValue>(startTime);
  const [draftEnd, setDraftEnd] = useState<DateTimeRangeValue>(endTime);
  const [error, setError] = useState<ValidationErrorType>(null);

  useEffect(() => {
    if (isOpen) {
      setDraftStart(startTime);
      setDraftEnd(endTime);
      setError(null);
    }
  }, [isOpen, startTime, endTime]);

  const handleApply = () => {
    const err = validateRange(draftStart, draftEnd);
    if (err) { setError(err); return; }
    onChange(draftStart, draftEnd);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setDraftStart(startTime);
    setDraftEnd(endTime);
    setError(null);
    setIsOpen(false);
  };

  const handlePreset = (preset: QuickPreset) => {
    onChange(preset.start, preset.end);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={(props) => (
          <Button
            {...props}
            variant="outline"
            className={cn(
              'h-8 px-3 gap-2 text-xs font-normal justify-start',
              isOpen && 'border-foreground',
              className,
            )}
          >
            <CalendarDays size={14} className="text-muted-foreground shrink-0" />
            <span>{toDisplayString(startTime)}</span>
            <span className="text-muted-foreground">→</span>
            <span>{toDisplayString(endTime)}</span>
          </Button>
        )}
      />

      <PopoverContent
        className="p-0 w-auto"
        align="start"
        sideOffset={4}
      >
        <div className="flex">
          {/* Quick ranges – zero natural height so right side drives container height;
               inner absolute div fills the allocated (stretched) column height and scrolls */}
          <div className="shrink-0 border-r w-40 relative">
            <div className="absolute inset-0 flex flex-col overflow-hidden">
              <div className="px-3 pt-2.5 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest shrink-0">
                Quick ranges
              </div>
              <div className="flex-1 overflow-y-auto">
                {quickPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className="block w-full text-left text-xs px-3 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => handlePreset(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Start + End panels */}
          <div className="flex flex-col justify-between relative">
            {/* Vertical divider — spans panels + footer */}
            <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 w-px bg-border" />

            <div className="flex">
              <div className="px-4 pb-4 pt-3">
                <SidePanel
                  title="Start"
                  value={draftStart}
                  compareValue={draftEnd}
                  onChange={(v) => { setDraftStart(v); setError(null); }}
                />
              </div>
              <div className="px-4 pb-4 pt-3">
                <SidePanel
                  title="End"
                  value={draftEnd}
                  compareValue={draftStart}
                  onChange={(v) => { setDraftEnd(v); setError(null); }}
                />
              </div>
            </div>

            {/* Footer */}
            <Separator />
            <div className="flex items-center justify-between px-4 py-2 gap-4">
              {error === 'validation' && (
                <span className="text-xs text-destructive">Start must be earlier than end.</span>
              )}
              {!error && <span />}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
                <Button size="sm" onClick={handleApply}>Apply</Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
