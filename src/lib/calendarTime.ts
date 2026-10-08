export const formatShortDate = (date: Date) =>
  `${date.getMonth() + 1}월 ${date.getDate()}일`

export const formatWeekTitle = (weekDays: Date[]) => {
  const start = weekDays[0]
  const end = weekDays[weekDays.length - 1]
  return `${start.getFullYear()}년 ${formatShortDate(start)} – ${formatShortDate(end)}`
}

export const toLocalDate = (dateKey: string) => new Date(`${dateKey}T00:00:00`)

export const sortDateKeys = (first: string, second: string) =>
  first <= second ? [first, second] : [second, first]

export const getDayNumber = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000)
}

export const shiftDateKey = (dateKey: string, offset: number) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + offset))
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`
}

export const formatRangeLabel = (startKey: string, endKey: string) => {
  const [start, end] = sortDateKeys(startKey, endKey)
  const startDate = toLocalDate(start)
  const endDate = toLocalDate(end)
  const startLabel = `${startDate.getMonth() + 1}월 ${startDate.getDate()}일`
  if (start === end) return startLabel
  const endLabel =
    startDate.getMonth() === endDate.getMonth()
      ? `${endDate.getDate()}일`
      : `${endDate.getMonth() + 1}월 ${endDate.getDate()}일`
  return `${startLabel}–${endLabel}`
}

export const formatMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
    minutes % 60,
  ).padStart(2, '0')}`

export const parseTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export const dateKeyFromDayNumber = (dayNumber: number) => {
  const date = new Date(dayNumber * 86_400_000)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export const shiftDateTime = (
  dateKey: string,
  time: string,
  sourceStartKey: string,
  sourceStartMinutes: number,
  targetStartKey: string,
  targetStartMinutes: number,
) => {
  const relativeMinutes =
    (getDayNumber(dateKey) - getDayNumber(sourceStartKey)) * 1_440 +
    parseTime(time) -
    sourceStartMinutes
  const targetAbsoluteMinutes =
    getDayNumber(targetStartKey) * 1_440 +
    targetStartMinutes +
    relativeMinutes
  const targetDayNumber = Math.floor(targetAbsoluteMinutes / 1_440)
  const targetMinutes =
    ((targetAbsoluteMinutes % 1_440) + 1_440) % 1_440
  return {
    date: dateKeyFromDayNumber(targetDayNumber),
    time: formatMinutes(targetMinutes),
  }
}

export const TIME_GRID_START_MINUTES = 6 * 60
export const TIME_GRID_END_MINUTES = 24 * 60
export const TIME_SLOT_MINUTES = 30

export const getTimeSlotKey = (dateKey: string, startMinutes: number) =>
  `${dateKey}:${startMinutes}`

export const parseTimeSlotKey = (slotKey: string) => {
  const separatorIndex = slotKey.lastIndexOf(':')
  return {
    dateKey: slotKey.slice(0, separatorIndex),
    startMinutes: Number(slotKey.slice(separatorIndex + 1)),
  }
}
