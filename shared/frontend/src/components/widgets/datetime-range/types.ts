export type DateTimeRangeType = 'absolute' | 'relative';

export type ValidationErrorType = 'validation' | 'range' | 'empty' | null;

export type DateTimeRelativeFormat =
  | 'Seconds ago'
  | 'Minutes ago'
  | 'Hours ago'
  | 'Days ago'
  | 'Weeks ago'
  | 'Months ago'
  | 'Years ago';

export interface DateTimeRangeValue {
  type: DateTimeRangeType;
  absoluteValue?: Date;
  relativeValue?: number | string;
  relativeFormat?: DateTimeRelativeFormat;
  relativeNow?: boolean;
}

export interface QuickPreset {
  label: string;
  start: DateTimeRangeValue;
  end: DateTimeRangeValue;
}
