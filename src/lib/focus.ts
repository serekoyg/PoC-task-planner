import type { FocusRecord, FocusSegment } from '../data/focusRecords'

type FocusInterval = {
  start: number
  end: number
}

export const getFocusSegments = (record: FocusRecord): FocusSegment[] =>
  record.segments?.length
    ? record.segments
    : [{ startedAt: record.startedAt, endedAt: record.endedAt }]

const toInterval = (
  segment: FocusSegment,
  nowMs: number,
): FocusInterval => ({
  start: new Date(segment.startedAt).getTime(),
  end: segment.endedAt ? new Date(segment.endedAt).getTime() : nowMs,
})

export const isFocusRecordRunning = (record: FocusRecord) => {
  if (record.endedAt) return false
  const segments = getFocusSegments(record)
  return Boolean(segments.length && !segments[segments.length - 1].endedAt)
}

export const getFocusDurationSeconds = (
  record: FocusRecord,
  nowMs = Date.now(),
) => {
  const milliseconds = getFocusSegments(record).reduce((total, segment) => {
    const { start, end } = toInterval(segment, nowMs)
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return total
    }
    return total + end - start
  }, 0)

  return Math.floor(milliseconds / 1000)
}

export const getTotalFocusSeconds = (
  records: FocusRecord[],
  nowMs = Date.now(),
) => records.reduce(
  (total, record) => total + getFocusDurationSeconds(record, nowMs),
  0,
)

export const getPureFocusSeconds = (
  records: FocusRecord[],
  nowMs = Date.now(),
) => {
  const intervals = records
    .flatMap((record) =>
      getFocusSegments(record).map((segment) => toInterval(segment, nowMs)),
    )
    .filter(({ start, end }) => Number.isFinite(start) && Number.isFinite(end) && end > start)
    .sort((a, b) => a.start - b.start)

  if (!intervals.length) return 0

  let totalMilliseconds = 0
  let currentStart = intervals[0].start
  let currentEnd = intervals[0].end

  intervals.slice(1).forEach((interval) => {
    if (interval.start <= currentEnd) {
      currentEnd = Math.max(currentEnd, interval.end)
      return
    }

    totalMilliseconds += currentEnd - currentStart
    currentStart = interval.start
    currentEnd = interval.end
  })

  totalMilliseconds += currentEnd - currentStart
  return Math.floor(totalMilliseconds / 1000)
}

export const formatFocusTimer = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60

  if (hours > 0) {
    return [hours, minutes, rest]
      .map((value) => String(value).padStart(2, '0'))
      .join(':')
  }

  return [minutes, rest]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}
