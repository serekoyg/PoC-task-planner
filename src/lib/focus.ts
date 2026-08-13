import type { FocusRecord } from '../data/focusRecords'

type FocusInterval = {
  start: number
  end: number
}

const toInterval = (record: FocusRecord, nowMs: number): FocusInterval => ({
  start: new Date(record.startedAt).getTime(),
  end: record.endedAt ? new Date(record.endedAt).getTime() : nowMs,
})

export const getFocusDurationSeconds = (
  record: FocusRecord,
  nowMs = Date.now(),
) => {
  const { start, end } = toInterval(record, nowMs)
  return Math.max(0, Math.floor((end - start) / 1000))
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
    .map((record) => toInterval(record, nowMs))
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
