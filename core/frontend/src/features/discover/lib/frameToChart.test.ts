import { frameToAlignedData, canRenderAsChart } from './frameToChart'

const T1 = 1_700_000_000
const T2 = 1_700_000_060

describe('frameToAlignedData', () => {
  // ── no time field ───────────────────────────────────────────────────────────
  it('returns null when no time field exists', () => {
    expect(frameToAlignedData({
      fields: [
        { name: 'cpu', values: [80, 40] },
      ],
    })).toBeNull()
  })

  it('returns null when no numeric field exists', () => {
    expect(frameToAlignedData({
      fields: [
        { name: 'time', values: [T1, T2] },
        { name: 'host', values: ['a', 'b'] },
      ],
    })).toBeNull()
  })

  // ── case ①: no string, multiple numeric ────────────────────────────────────
  it('①  no string — uses field names as series labels', () => {
    const result = frameToAlignedData({
      fields: [
        { name: 'time', kind: 'time', values: [T1, T2] },
        { name: 'cpu',  kind: 'number', values: [80, 85] },
        { name: 'mem',  kind: 'number', values: [1024, 1100] },
      ],
    })
    expect(result).not.toBeNull()
    expect(result!.series.map((s) => s.label)).toEqual(['cpu', 'mem'])
    expect(result!.data[0]).toEqual([T1, T2])   // timestamps
    expect(result!.data[1]).toEqual([80, 85])    // cpu
    expect(result!.data[2]).toEqual([1024, 1100]) // mem
  })

  // ── case ②: 1 string, 1 numeric ────────────────────────────────────────────
  it('②  1 string 1 numeric — string values become series labels', () => {
    const result = frameToAlignedData({
      fields: [
        { name: 'time',     kind: 'time',   values: [T1,      T1,      T2,      T2      ] },
        { name: 'hostname', kind: 'string', values: ['host-a','host-b','host-a','host-b'] },
        { name: 'cnt',      kind: 'number', values: [10,      15,      12,      8       ] },
      ],
    })
    expect(result).not.toBeNull()
    expect(result!.series.map((s) => s.label)).toEqual(['host-a', 'host-b'])
    expect(result!.data[0]).toEqual([T1, T2])
    expect(result!.data[1]).toEqual([10, 12])  // host-a
    expect(result!.data[2]).toEqual([15, 8])   // host-b
  })

  // ── case ③: multiple strings, 1 numeric ────────────────────────────────────
  it('③  N strings 1 numeric — combines string values with " | "', () => {
    const result = frameToAlignedData({
      fields: [
        { name: 'time',   kind: 'time',   values: [T1,           T1              ] },
        { name: 'host',   kind: 'string', values: ['host-a',     'host-b'        ] },
        { name: 'region', kind: 'string', values: ['us-east',    'ap-northeast'  ] },
        { name: 'cnt',    kind: 'number', values: [10,           15              ] },
      ],
    })
    expect(result).not.toBeNull()
    expect(result!.series.map((s) => s.label)).toEqual([
      'host-a | us-east',
      'host-b | ap-northeast',
    ])
  })

  // ── case ④: 1 string, multiple numeric ─────────────────────────────────────
  it('④  1 string N numeric — "stringValue · fieldName" series', () => {
    const result = frameToAlignedData({
      fields: [
        { name: 'time',     kind: 'time',   values: [T1,      T1,      T2,      T2      ] },
        { name: 'hostname', kind: 'string', values: ['host-a','host-b','host-a','host-b'] },
        { name: 'cpu',      kind: 'number', values: [80,      40,      85,      45      ] },
        { name: 'mem',      kind: 'number', values: [1024,    512,     1100,    520     ] },
      ],
    })
    expect(result).not.toBeNull()
    expect(result!.series.map((s) => s.label)).toEqual([
      'host-a · cpu',
      'host-a · mem',
      'host-b · cpu',
      'host-b · mem',
    ])
    expect(result!.data[0]).toEqual([T1, T2])
    expect(result!.data[1]).toEqual([80, 85])   // host-a · cpu
    expect(result!.data[2]).toEqual([1024, 1100]) // host-a · mem
    expect(result!.data[3]).toEqual([40, 45])   // host-b · cpu
    expect(result!.data[4]).toEqual([512, 520]) // host-b · mem
  })

  // ── sparse timestamps → null fill ──────────────────────────────────────────
  it('fills null for missing timestamps in a series', () => {
    // host-a only has T1, host-b only has T2
    const result = frameToAlignedData({
      fields: [
        { name: 'time',     kind: 'time',   values: [T1,      T2      ] },
        { name: 'hostname', kind: 'string', values: ['host-a','host-b'] },
        { name: 'cnt',      kind: 'number', values: [10,      15      ] },
      ],
    })
    expect(result).not.toBeNull()
    expect(result!.data[0]).toEqual([T1, T2])
    expect(result!.data[1]).toEqual([10, null])  // host-a: T2 is null
    expect(result!.data[2]).toEqual([null, 15])  // host-b: T1 is null
  })

  // ── time field detection heuristics ────────────────────────────────────────
  it('detects time field by kind="time"', () => {
    const result = frameToAlignedData({
      fields: [
        { name: 'ts', kind: 'time', values: [T1] },
        { name: 'v',  kind: 'number', values: [1] },
      ],
    })
    expect(result).not.toBeNull()
  })

  it('detects time field by name "timestamp"', () => {
    const result = frameToAlignedData({
      fields: [
        { name: 'timestamp', values: [T1] },
        { name: 'v', values: [1] },
      ],
    })
    expect(result).not.toBeNull()
  })

  it('detects time field by unix number value', () => {
    const result = frameToAlignedData({
      fields: [
        { name: 'created_at', values: [T1] },   // no kind, but > 1_000_000_000
        { name: 'cnt', values: [42] },
      ],
    })
    expect(result).not.toBeNull()
    expect(result!.series[0].label).toBe('cnt')
  })

  it('converts ms timestamps to seconds', () => {
    const T1_MS = T1 * 1000
    const result = frameToAlignedData({
      fields: [
        { name: 'time', kind: 'time', values: [T1_MS] },
        { name: 'v', kind: 'number', values: [1] },
      ],
    })
    expect(result!.data[0][0]).toBeCloseTo(T1, 0)
  })
})

describe('canRenderAsChart', () => {
  it('returns false for null', () => {
    expect(canRenderAsChart(null)).toBe(false)
  })

  it('returns false when chart cannot be built', () => {
    expect(canRenderAsChart({ fields: [{ name: 'cpu', values: [1] }] })).toBe(false)
  })

  it('returns true when chart can be built', () => {
    expect(canRenderAsChart({
      fields: [
        { name: 'time', kind: 'time', values: [T1] },
        { name: 'cpu', kind: 'number', values: [80] },
      ],
    })).toBe(true)
  })
})
