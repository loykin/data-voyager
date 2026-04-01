// Based on https://github.com/huybuidac/shadcn-datetime-picker — popover removed, panel only.
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, getYear, setYear, addMonths, subMonths } from 'date-fns';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon } from 'lucide-react';
import { DayPicker, Matcher, TZDate } from 'react-day-picker';
import { cn } from '../../../lib/utils';
import { Button, buttonVariants } from '../../ui/button';
import { MonthYearPicker, TimePicker } from './DatetimeUtil';

export type CalendarProps = Omit<React.ComponentProps<typeof DayPicker>, 'mode'>;

export interface DateTimePanelProps {
  value: Date | undefined;
  /** Called immediately on every change when `immediate` is true. Called on Done otherwise. */
  onChangeAction: (date: Date | undefined, isSuccess?: boolean) => void;
  min?: Date;
  max?: Date;
  timezone?: string;
  disabled?: boolean;
  hideTime?: boolean;
  use12HourFormat?: boolean;
  clearable?: boolean;
  timePicker?: { hour?: boolean; minute?: boolean; second?: boolean };
  /** When true, hides Cancel/Done buttons and propagates changes immediately. */
  immediate?: boolean;
  isError?: boolean;
  compareValue?: Date;
  title?: string;
  validateDateRange?: (currentValue: Date, compareValue?: Date) => { isValid: boolean; errorType: 'validation' | 'range' | 'empty' | null };
  getRangeErrorMessage?: (errorType: 'validation' | 'range' | 'empty' | null, title?: string) => string;
}

export function DateTimePanel({
  value,
  onChangeAction,
  min,
  max,
  timezone,
  hideTime,
  use12HourFormat,
  timePicker,
  immediate = false,
  isError,
  compareValue,
  title,
  validateDateRange,
  getRangeErrorMessage,
  ...props
}: DateTimePanelProps & CalendarProps) {
  const [monthYearPicker, setMonthYearPicker] = useState<'month' | 'year' | false>(false);
  const initDate = useMemo(() => new TZDate(value || new Date(), timezone), [value, timezone]);

  const [month, setMonth] = useState<Date>(initDate);
  const [date, setDate] = useState<Date>(initDate);
  const [errorType, setErrorType] = useState<'validation' | 'range' | 'empty' | null>(null);
  const [previousDate, setPreviousDate] = useState<Date>(initDate);

  const endMonth = useMemo(() => setYear(month, getYear(month) + 1), [month]);
  const minDate = useMemo(() => (min ? new TZDate(min, timezone) : undefined), [min, timezone]);
  const maxDate = useMemo(() => (max ? new TZDate(max, timezone) : undefined), [max, timezone]);

  const validate = useCallback(
    (cur: Date, cmp?: Date): { isValid: boolean; errorType: 'validation' | 'range' | 'empty' | null } => {
      if (validateDateRange) return validateDateRange(cur, cmp);
      if (!cmp) return { isValid: true, errorType: null };
      if (title === 'Start Date' && cur >= cmp) return { isValid: false, errorType: 'validation' };
      if (title === 'End Date' && cur <= cmp) return { isValid: false, errorType: 'validation' };
      return { isValid: true, errorType: null };
    },
    [validateDateRange, title],
  );

  const onDayChanged = useCallback(
    (d: Date) => {
      d.setHours(date.getHours(), date.getMinutes(), date.getSeconds());
      if (min && d < min) d.setHours(min.getHours(), min.getMinutes(), min.getSeconds());
      if (max && d > max) d.setHours(max.getHours(), max.getMinutes(), max.getSeconds());
      setDate(d);
      if (immediate) onChangeAction(new Date(d), true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [date, immediate, onChangeAction],
  );

  const onTimeChanged = useCallback(
    (d: Date) => {
      setDate(d);
      if (immediate) onChangeAction(new Date(d), true);
    },
    [immediate, onChangeAction],
  );

  const onSubmit = useCallback(() => {
    const result = validate(date, compareValue);
    setErrorType(result.isValid ? null : result.errorType);
    if (result.isValid) {
      onChangeAction(new Date(date), true);
      setPreviousDate(new Date(date));
    }
  }, [date, onChangeAction, compareValue, validate]);

  const onCancel = useCallback(() => {
    setDate(previousDate);
    setMonth(previousDate);
    setErrorType(null);
    onChangeAction(undefined, false);
  }, [previousDate, onChangeAction]);

  const onMonthYearChanged = useCallback((d: Date, mode: 'month' | 'year') => {
    setMonth(d);
    setMonthYearPicker(mode === 'year' ? 'month' : false);
  }, []);

  const onNextMonth = useCallback(() => setMonth(addMonths(month, 1)), [month]);
  const onPrevMonth = useCallback(() => setMonth(subMonths(month, 1)), [month]);

  useEffect(() => {
    setDate(initDate);
    setMonth(initDate);
    setMonthYearPicker(false);
    setPreviousDate(initDate);
  }, [initDate]);

  return (
    <div>
      <div className="flex items-center justify-between mt-4">
        <div className="text-md font-bold ms-2 flex gap-2 items-center cursor-pointer">
          <div>
            <span onClick={() => setMonthYearPicker(monthYearPicker === 'month' ? false : 'month')}>
              {format(month, 'MMMM')}
            </span>
            <span className="ms-1" onClick={() => setMonthYearPicker(monthYearPicker === 'year' ? false : 'year')}>
              {format(month, 'yyyy')}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setMonthYearPicker(monthYearPicker ? false : 'year')}>
            {monthYearPicker
              ? <ChevronUpIcon className="w-4 h-4 stroke-muted-foreground" />
              : <ChevronDownIcon className="w-4 h-4 stroke-muted-foreground" />}
          </Button>
        </div>
        <div className={cn('flex space-x-2', monthYearPicker ? 'hidden' : '')}>
          <Button variant="outline" size="icon" className="w-7 h-7" onClick={onPrevMonth}>
            <ChevronLeftIcon className="w-4 h-4 stroke-muted-foreground" />
          </Button>
          <Button variant="outline" size="icon" className="w-7 h-7" onClick={onNextMonth}>
            <ChevronRightIcon className="w-4 h-4 stroke-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <DayPicker
          timeZone={timezone}
          mode="single"
          selected={date}
          modifiers={{
            selected: (sel: Date) => {
              const a = new Date(sel); const b = new Date(date);
              return a.setHours(0, 0, 0, 0) === b.setHours(0, 0, 0, 0);
            },
            range_middle: (cur: Date) => {
              const d = new Date(date); const c = new Date(cur);
              return (!!max && cur < max && c > d) || (!!min && cur > min && c < d);
            },
          }}
          onSelect={(d) => d && onDayChanged(d)}
          month={month}
          endMonth={endMonth}
          disabled={[max ? { after: max } : null, min ? { before: min } : null].filter(Boolean) as Matcher[]}
          onMonthChange={setMonth}
          classNames={{
            dropdowns: 'flex w-full gap-2',
            months: 'flex w-full h-fit',
            month: 'flex flex-col w-full',
            month_caption: 'hidden',
            button_previous: 'hidden',
            button_next: 'hidden',
            month_grid: 'w-full border-collapse',
            weekdays: 'flex justify-between mt-2',
            weekday: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
            week: 'flex w-full justify-between mt-2',
            day: 'h-9 w-9 text-center text-sm p-0 relative flex items-center justify-center focus-within:relative focus-within:z-20 [&[aria-selected]>button:hover]:bg-primary [&[aria-selected]>button:hover]:text-primary-foreground',
            day_button: cn(buttonVariants({ variant: 'ghost' }), 'size-9 p-0 font-normal'),
            range_end: 'day-range-end bg-primary',
            selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
            today: 'bg-accent text-accent-foreground',
            outside: 'day-outside text-muted-foreground/80 aria-selected:bg-primary aria-selected:text-primary-foreground',
            disabled: 'text-muted-foreground opacity-50',
            range_middle: 'w-full bg-secondary aria-selected:bg-primary aria-selected:text-primary-foreground',
            hidden: 'invisible',
          }}
          showOutsideDays={true}
          {...props}
        />
        <div className={cn('absolute top-0 left-0 bottom-0 right-0', monthYearPicker ? 'bg-popover' : 'hidden')} />
        <MonthYearPicker
          value={month}
          mode={monthYearPicker as 'month' | 'year'}
          onChange={onMonthYearChanged}
          minDate={minDate}
          maxDate={maxDate}
          className={cn('absolute top-0 left-0 bottom-0 right-0', monthYearPicker ? '' : 'hidden')}
        />
      </div>

      <div className="flex flex-col gap-6 mt-4">
        {!hideTime && (
          <TimePicker
            timePicker={timePicker}
            value={date}
            onChange={onTimeChanged}
            use12HourFormat={use12HourFormat}
            min={minDate}
            max={maxDate}
          />
        )}
        {(isError || errorType !== null) && (
          <div className="py-3 px-4 border border-destructive max-w-full">
            <span className="text-xs text-destructive leading-snug block">
              {getRangeErrorMessage?.(errorType, title) ?? 'Invalid date range.'}
            </span>
          </div>
        )}
        {!immediate && (
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={onSubmit}>Done</Button>
          </div>
        )}
      </div>
    </div>
  );
}
