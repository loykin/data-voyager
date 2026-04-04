import { PostgreSQL, MySQL, MSSQL, MariaSQL, SQLDialect } from '@codemirror/lang-sql';
import { SqlQueryEditor } from './SqlQueryEditor';

// ─── ClickHouse dialect ──────────────────────────────────────────────────────
// Standard SQL keywords + ClickHouse-specific extensions
const CH_KEYWORDS = [
  // Standard DML
  'select from where group by order having limit offset union all as join left right inner outer cross full on using and or not in like between is null exists any some distinct case when then else end',
  'insert into values update set delete truncate',
  'create table drop alter add column default constraint primary key foreign references index view database schema',
  'if replace with recursive merge through show describe desc use',
  // ClickHouse-specific
  'final prewhere settings format sample global asof totals cube rollup outfile codec ttl materialized populate watch live',
  'attach detach optimize system flush reload mutations undrop partition part',
  'array join left array join engine mergetree replacingmergetree summingmergetree aggregatingmergetree collapsingmergetree versionedcollapsingmergetree graphitemergetree',
  'replicated replicatedmergetree distributed kafka rabbitmq s3 hdfs url file null memory buffer',
  'on cluster to except intersect format json jsoncompact csv tsv pretty preittynoescapes values',
].join(' ');

const CH_BUILTIN = [
  // Date/time
  'toDate toDateTime toDateTime64 toDate32 toDateTimeOrNull now today yesterday',
  'toStartOfInterval toStartOfDay toStartOfHour toStartOfMinute toStartOfFiveMinutes toStartOfTenMinutes toStartOfFifteenMinutes toStartOfMonth toStartOfQuarter toStartOfYear toStartOfWeek',
  'toRelativeYearNum toRelativeQuarterNum toRelativeMonthNum toRelativeWeekNum toRelativeDayNum toRelativeHourNum toRelativeMinuteNum toRelativeSecondNum',
  'dateDiff dateAdd dateSub addDays addHours addMinutes addSeconds addMonths addYears subtractDays subtractHours subtractMinutes subtractSeconds subtractMonths subtractYears',
  'toUnixTimestamp fromUnixTimestamp toYYYYMM toYYYYMMDD toYYYYMMDDhhmmss formatDateTime',
  // Aggregates
  'count sum avg min max any anyLast anyHeavy uniq uniqExact uniqHLL12 uniqCombined',
  'quantile quantiles quantileExact quantileTDigest quantileBFloat16',
  'groupArray groupUniqArray groupArrayInsertAt groupArrayMovingSum groupArrayMovingAvg',
  'topK topKWeighted windowFunnel retention sequenceMatch sequenceCount',
  'sumMap minMap maxMap avgWeighted deltaSum exponentialMovingAverage',
  'stddevPop stddevSamp varPop varSamp covarPop covarSamp corr',
  // String
  'concat concatWithSeparator substring substr lower upper lowerUTF8 upperUTF8 trim trimLeft trimRight',
  'splitByChar splitByString splitByRegexp arrayStringConcat',
  'startsWith endsWith match extract replaceOne replaceAll replaceRegexpOne replaceRegexpAll',
  'length lengthUTF8 reverse reverseUTF8 charLength char position positionCaseInsensitive',
  'toString toStringCutToZero format empty notEmpty',
  // Array
  'array arrayJoin arrayMap arrayFilter arrayCount arraySum arrayMax arrayMin arrayAvg arrayFirst arrayLast',
  'arrayFlatten arrayCompact arrayUniq arraySorted arrayReverseSort arraySort arrayReverse',
  'has hasAny hasAll indexOf arrayElement length range emptyArrayToSingle',
  'tupleElement untuple tuple arrayZip arrayDifference arrayCumSum',
  // Type conversions
  'toUInt8 toUInt16 toUInt32 toUInt64 toUInt128 toUInt256',
  'toInt8 toInt16 toInt32 toInt64 toInt128 toInt256',
  'toFloat32 toFloat64 toDecimal32 toDecimal64 toDecimal128',
  'toUInt8OrNull toUInt32OrNull toInt32OrNull toFloat64OrNull toDateOrNull toDateTimeOrNull',
  'toUInt8OrZero toUInt32OrZero toInt32OrZero toFloat64OrZero',
  'reinterpretAsUInt8 reinterpretAsUInt32 reinterpretAsInt32 reinterpretAsFloat32 reinterpretAsFloat64',
  'accurateCast accurateCastOrNull accurateCastOrDefault',
  // Conditional / null
  'if multiIf ifNull nullIf coalesce isNull isNotNull isNaN assumeNotNull toNullable',
  // Math
  'abs round floor ceil truncate sqrt cbrt exp log log2 log10 sin cos tan asin acos atan atan2',
  'sign pow intDiv mod remainder bitAnd bitOr bitXor bitNot bitShiftLeft bitShiftRight',
  'greatest least intDivOrZero modulo moduloOrZero',
  // Hashing / encoding
  'cityHash64 sipHash64 sipHash128 xxHash32 xxHash64 farmHash64 metroHash64',
  'md5 sha1 sha224 sha256 sha512 base64Encode base64Decode hex unhex',
  // JSON
  'JSONHas JSONLength JSONKey JSONType JSONExtractUInt JSONExtractInt JSONExtractFloat JSONExtractBool JSONExtractString JSONExtractRaw JSONExtractArrayRaw',
  'visitParamHas visitParamExtractUInt visitParamExtractString',
  'simpleJSONHas simpleJSONExtractUInt simpleJSONExtractString',
  // Dict / other
  'dictGet dictGetOrNull dictGetOrDefault dictHas dictGetChildren dictGetDescendants',
  'in notIn globalIn globalNotIn',
  'sleep sleepEachRow throwIf assert',
  'materialize ignore identity',
].join(' ');

const CH_TYPES = [
  'UInt8 UInt16 UInt32 UInt64 UInt128 UInt256',
  'Int8 Int16 Int32 Int64 Int128 Int256',
  'Float32 Float64',
  'Decimal Decimal32 Decimal64 Decimal128 Decimal256',
  'String FixedString UUID',
  'Date Date32 DateTime DateTime64',
  'Bool',
  'Array Tuple Map Nested',
  'Nullable LowCardinality',
  'Enum Enum8 Enum16',
  'IPv4 IPv6',
  'AggregateFunction SimpleAggregateFunction',
  'IntervalSecond IntervalMinute IntervalHour IntervalDay IntervalWeek IntervalMonth IntervalQuarter IntervalYear',
  // Lowercase aliases
  'int8 int16 int32 int64 uint8 uint16 uint32 uint64 float32 float64 boolean text varchar char',
].join(' ');

export const ClickHouseDialect = SQLDialect.define({
  keywords: CH_KEYWORDS,
  builtin: CH_BUILTIN,
  types: CH_TYPES,
  hashComments: true,         // ClickHouse supports # as comment
  operatorChars: '*+-%<>!=&|^',
  identifierQuotes: '`',      // ClickHouse prefers backtick (also supports double-quote)
});

/**
 * Minimal interface that is structurally compatible with SDK's BaseEditorProps.
 * ctx is accepted but not used — simple SQL editors don't need the plugin context.
 */
interface BaseEditorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx?: any;
  query: string;
  onChange: (value: string) => void;
  onRun?: () => void;
}

/**
 * Ready-made query editor components for common SQL dialects.
 * Extensions import these directly — no need for @codemirror dependencies.
 */

export function PostgreSQLQueryEditor({ query, onChange, onRun }: BaseEditorProps) {
  return (
    <SqlQueryEditor
      value={query}
      onChange={onChange}
      onRun={onRun}
      dialect={PostgreSQL}
      className="h-full w-full"
    />
  );
}

export function MySQLQueryEditor({ query, onChange, onRun }: BaseEditorProps) {
  return (
    <SqlQueryEditor
      value={query}
      onChange={onChange}
      onRun={onRun}
      dialect={MySQL}
      className="h-full w-full"
    />
  );
}

export function MSSQLQueryEditor({ query, onChange, onRun }: BaseEditorProps) {
  return (
    <SqlQueryEditor
      value={query}
      onChange={onChange}
      onRun={onRun}
      dialect={MSSQL}
      className="h-full w-full"
    />
  );
}

export function MariaDBQueryEditor({ query, onChange, onRun }: BaseEditorProps) {
  return (
    <SqlQueryEditor
      value={query}
      onChange={onChange}
      onRun={onRun}
      dialect={MariaSQL}
      className="h-full w-full"
    />
  );
}

/** Generic SQL editor (no dialect-specific keywords) */
export function GenericSQLQueryEditor({ query, onChange, onRun }: BaseEditorProps) {
  return (
    <SqlQueryEditor
      value={query}
      onChange={onChange}
      onRun={onRun}
      className="h-full w-full"
    />
  );
}

export function ClickHouseQueryEditor({ query, onChange, onRun }: BaseEditorProps) {
  return (
    <SqlQueryEditor
      value={query}
      onChange={onChange}
      onRun={onRun}
      dialect={ClickHouseDialect}
      className="h-full w-full"
    />
  );
}
