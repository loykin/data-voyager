import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addHours,
  endOfDay,
  endOfHour,
  endOfMinute,
  endOfMonth,
  endOfYear,
  format,
  getMonth,
  getYear,
  parse,
  setHours,
  setMilliseconds,
  setMinutes,
  setSeconds,
  setYear,
  startOfDay,
  startOfHour,
  startOfMinute,
  startOfMonth,
  startOfYear,
  subHours,
} from 'date-fns';
import { setMonth as setMonthFns } from 'date-fns/setMonth';
import { cn } from '../../../lib/utils';
import { ScrollArea } from '../../ui/scroll-area';
import { Button } from '../../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { CheckIcon, ChevronDownIcon, Clock } from 'lucide-react';

const AM_VALUE = 0;
const PM_VALUE = 1;

interface TimeOption {
  value: number;
  label: string;
  disabled: boolean;
}

// ─── MonthYearPicker ─────────────────────────────────────────────────────────

interface MonthYearPickerProps {
  value: Date;
  mode: 'month' | 'year';
  minDate?: Date;
  maxDate?: Date;
  onChange: (value: Date, mode: 'month' | 'year') => void;
  className?: string;
}

export function MonthYearPicker({ value, minDate, maxDate, mode = 'month', onChange, className }: MonthYearPickerProps) {
  const yearRef = useRef<HTMLDivElement>(null);

  const years = useMemo(() => {
    const result: TimeOption[] = [];
    for (let i = 1912; i < 2100; i++) {
      let disabled = false;
      const startY = startOfYear(setYear(value, i));
      const endY = endOfYear(setYear(value, i));
      if (minDate && endY < minDate) disabled = true;
      if (maxDate && startY > maxDate) disabled = true;
      result.push({ value: i, label: i.toString(), disabled });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const months = useMemo(() => {
    const result: TimeOption[] = [];
    for (let i = 0; i < 12; i++) {
      let disabled = false;
      const startM = startOfMonth(setMonthFns(value, i));
      const endM = endOfMonth(setMonthFns(value, i));
      if (minDate && endM < minDate) disabled = true;
      if (maxDate && startM > maxDate) disabled = true;
      result.push({ value: i, label: format(new Date(0, i), 'MMM'), disabled });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const onYearChange = useCallback(
    (v: TimeOption) => {
      let newDate = setYear(value, v.value);
      if (minDate && newDate < minDate) newDate = setMonthFns(newDate, getMonth(minDate));
      if (maxDate && newDate > maxDate) newDate = setMonthFns(newDate, getMonth(maxDate));
      onChange(newDate, 'year');
    },
    [onChange, value, minDate, maxDate],
  );

  useEffect(() => {
    if (mode === 'year') {
      yearRef.current?.scrollIntoView({ behavior: 'auto', block: 'center' });
    }
  }, [mode, value]);

  return (
    <div className={cn(className)}>
      <ScrollArea className="h-full">
        {mode === 'year' && (
          <div className="grid grid-cols-4">
            {years.map((year) => (
              <div key={year.value} ref={year.value === getYear(value) ? yearRef : undefined}>
                <Button
                  disabled={year.disabled}
                  variant={getYear(value) === year.value ? 'default' : 'ghost'}
                  className="rounded-none"
                  onClick={() => onYearChange(year)}
                >
                  {year.label}
                </Button>
              </div>
            ))}
          </div>
        )}
        {mode === 'month' && (
          <div className="grid grid-cols-3 gap-4 mt-7">
            {months.map((month) => (
              <Button
                key={month.value}
                size="lg"
                disabled={month.disabled}
                variant={getMonth(value) === month.value ? 'default' : 'ghost'}
                className="rounded-none"
                onClick={() => onChange(setMonthFns(value, month.value), 'month')}
              >
                {month.label}
              </Button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ─── TimePicker ───────────────────────────────────────────────────────────────

interface TimeItemProps {
  option: TimeOption;
  selected: boolean;
  onSelect: (option: TimeOption) => void;
  className?: string;
  disabled?: boolean;
}

function TimeItem({ option, selected, onSelect, className, disabled }: TimeItemProps) {
  return (
    <Button
      variant="ghost"
      className={cn('flex justify-center px-1 pe-2 ps-1', className)}
      onClick={() => onSelect(option)}
      disabled={disabled}
    >
      <div className="w-4">{selected && <CheckIcon className="my-auto size-4" />}</div>
      <span className="ms-2">{option.label}</span>
    </Button>
  );
}

interface BuildTimeOptions {
  use12HourFormat?: boolean;
  value: Date;
  formatStr: string;
  hour: number;
  minute: number;
  second: number;
  ampm: number;
}

function buildTime({ use12HourFormat, value, formatStr, hour, minute, second, ampm }: BuildTimeOptions): Date {
  if (use12HourFormat) {
    const raw = format(value, formatStr);
    let s = raw.slice(0, 11) + hour.toString().padStart(2, '0') + raw.slice(13);
    s = s.slice(0, 14) + minute.toString().padStart(2, '0') + s.slice(16);
    s = s.slice(0, 17) + second.toString().padStart(2, '0') + s.slice(19);
    s = s.slice(0, 24) + (ampm === AM_VALUE ? 'AM' : 'PM') + s.slice(26);
    return parse(s, formatStr, value);
  }
  return setHours(setMinutes(setSeconds(value, second), minute), hour);
}

interface TimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  use12HourFormat?: boolean;
  min?: Date;
  max?: Date;
  timePicker?: { hour?: boolean; minute?: boolean; second?: boolean };
}

export function TimePicker({ value, onChange, use12HourFormat, min, max, timePicker }: TimePickerProps) {
  const formatStr = useMemo(
    () => (use12HourFormat ? 'yyyy-MM-dd hh:mm:ss.SSS a xxxx' : 'yyyy-MM-dd HH:mm:ss.SSS xxxx'),
    [use12HourFormat],
  );

  const [ampm, setAmpm] = useState(format(value, 'a') === 'AM' ? AM_VALUE : PM_VALUE);
  const [hour, setHour] = useState(use12HourFormat ? +format(value, 'hh') : value.getHours());
  const [minute, setMinute] = useState(value.getMinutes());
  const [second, setSecond] = useState(value.getSeconds());

  useEffect(() => {
    onChange(buildTime({ use12HourFormat, value, formatStr, hour, minute, second, ampm }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hour, minute, second, ampm, formatStr, use12HourFormat]);

  const hourIn24h = useMemo(
    () => (use12HourFormat ? (hour % 12) + ampm * 12 : hour),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, use12HourFormat, ampm],
  );

  const hours = useMemo(
    () =>
      Array.from({ length: use12HourFormat ? 12 : 24 }, (_, i) => {
        const hourValue = use12HourFormat ? (i === 0 ? 12 : i) : i;
        const hDate = setHours(value, use12HourFormat ? i + ampm * 12 : i);
        let disabled = false;
        if (min && endOfHour(hDate) < min) disabled = true;
        if (max && startOfHour(hDate) > max) disabled = true;
        return { value: hourValue, label: hourValue.toString().padStart(2, '0'), disabled };
      }),
    [value, min, max, use12HourFormat, ampm],
  );

  const minutes = useMemo(() => {
    const anchor = setHours(value, hourIn24h);
    return Array.from({ length: 60 }, (_, i) => {
      const mDate = setMinutes(anchor, i);
      let disabled = false;
      if (min && endOfMinute(mDate) < min) disabled = true;
      if (max && startOfMinute(mDate) > max) disabled = true;
      return { value: i, label: i.toString().padStart(2, '0'), disabled };
    });
  }, [value, min, max, hourIn24h]);

  const seconds = useMemo(() => {
    const anchor = setMilliseconds(setMinutes(setHours(value, hourIn24h), minute), 0);
    const _min = min ? setMilliseconds(min, 0) : undefined;
    const _max = max ? setMilliseconds(max, 0) : undefined;
    return Array.from({ length: 60 }, (_, i) => {
      const sDate = setSeconds(anchor, i);
      let disabled = false;
      if (_min && sDate < _min) disabled = true;
      if (_max && sDate > _max) disabled = true;
      return { value: i, label: i.toString().padStart(2, '0'), disabled };
    });
  }, [value, minute, min, max, hourIn24h]);

  const ampmOptions = useMemo(() => {
    const startD = startOfDay(value);
    const endD = endOfDay(value);
    return [
      { value: AM_VALUE, label: 'AM' },
      { value: PM_VALUE, label: 'PM' },
    ].map((v) => {
      let disabled = false;
      const start = addHours(startD, v.value * 12);
      const end = subHours(endD, (1 - v.value) * 12);
      if (min && end < min) disabled = true;
      if (max && start > max) disabled = true;
      return { ...v, disabled };
    });
  }, [value, min, max]);

  const [open, setOpen] = useState(false);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const secondRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      if (open) {
        hourRef.current?.scrollIntoView({ behavior: 'auto' });
        minuteRef.current?.scrollIntoView({ behavior: 'auto' });
        secondRef.current?.scrollIntoView({ behavior: 'auto' });
      }
    }, 1);
    return () => clearTimeout(id);
  }, [open]);

  const onHourChange = useCallback(
    (v: TimeOption) => {
      if (min) {
        const t = buildTime({ use12HourFormat, value, formatStr, hour: v.value, minute, second, ampm });
        if (t < min) { setMinute(min.getMinutes()); setSecond(min.getSeconds()); }
      }
      if (max) {
        const t = buildTime({ use12HourFormat, value, formatStr, hour: v.value, minute, second, ampm });
        if (t > max) { setMinute(max.getMinutes()); setSecond(max.getSeconds()); }
      }
      setHour(v.value);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [use12HourFormat, value, formatStr, minute, second, ampm],
  );

  const onMinuteChange = useCallback(
    (v: TimeOption) => {
      if (min) {
        const t = buildTime({ use12HourFormat, value, formatStr, hour, minute: v.value, second, ampm });
        if (t < min) setSecond(min.getSeconds());
      }
      if (max) {
        const t = buildTime({ use12HourFormat, value, formatStr, hour, minute: v.value, second, ampm });
        if (t > max) setSecond(max.getSeconds());
      }
      setMinute(v.value);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [use12HourFormat, value, formatStr, hour, second, ampm],
  );

  const onAmpmChange = useCallback(
    (v: TimeOption) => {
      if (min) {
        const t = buildTime({ use12HourFormat, value, formatStr, hour, minute, second, ampm: v.value });
        if (t < min) {
          const h = min.getHours() % 12;
          setHour(h === 0 ? 12 : h);
          setMinute(min.getMinutes());
          setSecond(min.getSeconds());
        }
      }
      if (max) {
        const t = buildTime({ use12HourFormat, value, formatStr, hour, minute, second, ampm: v.value });
        if (t > max) {
          const h = max.getHours() % 12;
          setHour(h === 0 ? 12 : h);
          setMinute(max.getMinutes());
          setSecond(max.getSeconds());
        }
      }
      setAmpm(v.value);
    },
    [use12HourFormat, value, formatStr, hour, minute, second, min, max],
  );

  const display = useMemo(() => {
    const parts: string[] = [];
    for (const el of ['hour', 'minute', 'second']) {
      if (!timePicker || timePicker[el as keyof typeof timePicker]) {
        parts.push(el === 'hour' ? (use12HourFormat ? 'hh' : 'HH') : el === 'minute' ? 'mm' : 'ss');
      }
    }
    return format(value, parts.join(':') + (use12HourFormat ? ' a' : ''));
  }, [value, use12HourFormat, timePicker]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={(props) => (
          <Button {...props} variant="outline" role="combobox" aria-expanded={open} className="justify-between">
            <Clock className="mr-2 size-4" />
            {display}
            <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        )}
      />
      <PopoverContent className="p-0" side="top">
        <div className="flex-col gap-2 p-2">
          <div className="flex h-56 grow">
            {(!timePicker || timePicker.hour) && (
              <ScrollArea className="h-full grow">
                <div className="flex grow flex-col items-stretch overflow-y-auto pe-2 pb-48">
                  {hours.map((v) => (
                    <div key={v.value} ref={v.value === hour ? hourRef : undefined}>
                      <TimeItem option={v} selected={v.value === hour} onSelect={onHourChange} className="h-8" disabled={v.disabled} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            {(!timePicker || timePicker.minute) && (
              <ScrollArea className="h-full grow">
                <div className="flex grow flex-col items-stretch overflow-y-auto pe-2 pb-48">
                  {minutes.map((v) => (
                    <div key={v.value} ref={v.value === minute ? minuteRef : undefined}>
                      <TimeItem option={v} selected={v.value === minute} onSelect={onMinuteChange} className="h-8" disabled={v.disabled} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            {(!timePicker || timePicker.second) && (
              <ScrollArea className="h-full grow">
                <div className="flex grow flex-col items-stretch overflow-y-auto pe-2 pb-48">
                  {seconds.map((v) => (
                    <div key={v.value} ref={v.value === second ? secondRef : undefined}>
                      <TimeItem option={v} selected={v.value === second} onSelect={(v) => setSecond(v.value)} className="h-8" disabled={v.disabled} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            {use12HourFormat && (
              <ScrollArea className="h-full grow">
                <div className="flex grow flex-col items-stretch overflow-y-auto pe-2">
                  {ampmOptions.map((v) => (
                    <TimeItem key={v.value} option={v} selected={v.value === ampm} onSelect={onAmpmChange} className="h-8" disabled={v.disabled} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
