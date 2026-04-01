import { useState } from 'react'
import { DatetimeRange } from '@data-voyager/shared-ui/components/widgets/datetime-range/DatetimeRange'
import type { DateTimeRangeValue } from '@data-voyager/shared-ui/components/widgets/datetime-range/types'
import {
  relativeAgo,
  relativeNow,
  toTimestamp,
  toDisplayString,
  toUrlString,
  fromUrlString,
} from '@data-voyager/shared-ui/components/widgets/datetime-range/datetime-utils'

export function DatetimeDemoPage() {
  const [start, setStart] = useState<DateTimeRangeValue>(relativeAgo(1, 'Hours ago'))
  const [end, setEnd] = useState<DateTimeRangeValue>(relativeNow())

  const startTs = toTimestamp(start)
  const endTs = toTimestamp(end)

  const startUrl = toUrlString(start)
  const endUrl = toUrlString(end)

  return (
    <div className="p-8 flex flex-col gap-8 max-w-4xl">
      <div>
        <h1 className="text-lg font-semibold mb-1">DatetimeRange</h1>
        <p className="text-xs text-muted-foreground mb-4">
          Kibana/Grafana-style combined date-time range picker.
        </p>

        <DatetimeRange
          startTime={start}
          endTime={end}
          onChange={(s, e) => { setStart(s); setEnd(e) }}
        />
      </div>

      {/* Current values */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Current values</h2>
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr className="bg-muted/40">
              <th className="text-left px-3 py-2 border font-medium">Field</th>
              <th className="text-left px-3 py-2 border font-medium">Start</th>
              <th className="text-left px-3 py-2 border font-medium">End</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-1.5 border text-muted-foreground">Display</td>
              <td className="px-3 py-1.5 border font-mono">{toDisplayString(start)}</td>
              <td className="px-3 py-1.5 border font-mono">{toDisplayString(end)}</td>
            </tr>
            <tr>
              <td className="px-3 py-1.5 border text-muted-foreground">URL (Grafana format)</td>
              <td className="px-3 py-1.5 border font-mono">{startUrl}</td>
              <td className="px-3 py-1.5 border font-mono">{endUrl}</td>
            </tr>
            <tr>
              <td className="px-3 py-1.5 border text-muted-foreground">Unix (seconds)</td>
              <td className="px-3 py-1.5 border font-mono">{startTs}</td>
              <td className="px-3 py-1.5 border font-mono">{endTs}</td>
            </tr>
            <tr>
              <td className="px-3 py-1.5 border text-muted-foreground">Resolved date</td>
              <td className="px-3 py-1.5 border font-mono">{new Date(startTs * 1000).toLocaleString()}</td>
              <td className="px-3 py-1.5 border font-mono">{new Date(endTs * 1000).toLocaleString()}</td>
            </tr>
            <tr>
              <td className="px-3 py-1.5 border text-muted-foreground">Duration</td>
              <td className="px-3 py-1.5 border font-mono" colSpan={2}>
                {Math.round((endTs - startTs) / 60)} minutes ({endTs - startTs}s)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* URL roundtrip */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">URL roundtrip</h2>
        <p className="text-xs text-muted-foreground">
          Parsed back from URL strings via <code>fromUrlString()</code>.
        </p>
        <div className="text-xs font-mono bg-muted/30 rounded p-3 space-y-1">
          <div><span className="text-muted-foreground">from=</span>{startUrl}</div>
          <div><span className="text-muted-foreground">to=</span>{endUrl}</div>
          <div className="pt-1 border-t mt-2">
            <span className="text-muted-foreground">parsed start → </span>
            {JSON.stringify(fromUrlString(startUrl))}
          </div>
          <div>
            <span className="text-muted-foreground">parsed end → </span>
            {JSON.stringify(fromUrlString(endUrl))}
          </div>
        </div>
      </div>

      {/* Absolute mode demo */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Absolute preset example</h2>
        <DatetimeRange
          startTime={{ type: 'absolute', absoluteValue: new Date('2025-01-01T00:00:00') }}
          endTime={{ type: 'absolute', absoluteValue: new Date('2025-01-31T23:59:59') }}
          onChange={() => {}}
        />
      </div>
    </div>
  )
}
