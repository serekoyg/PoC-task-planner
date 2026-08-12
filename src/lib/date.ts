import type { CalendarEvent, Todo } from '../data/initialData'

export const getCalendarDays = (month: Date) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const calendarStart = new Date(firstDay)
  calendarStart.setDate(firstDay.getDate() - firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart)
    date.setDate(calendarStart.getDate() + index)
    return date
  })
}

export const formatSelectedDate = (date: Date) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date)

export const formatHeaderDate = (date: Date) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)

export const moveDate = (date: Date, amount: number) => {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + amount)
  return nextDate
}

export const isCalendarEventOnDate = (
  event: CalendarEvent,
  dateKey: string,
) => {
  if (event.repeat === 'none') return event.date === dateKey
  if (dateKey < event.date) return false

  const date = new Date(`${dateKey}T00:00:00`)
  const startDate = new Date(`${event.date}T00:00:00`)
  if (event.repeat === 'daily') return true
  if (event.repeat === 'weekdays') {
    const weekday = date.getDay()
    return weekday >= 1 && weekday <= 5
  }
  if (event.repeat === 'weekly') {
    const weekdays = event.repeatWeekdays?.length
      ? event.repeatWeekdays
      : [startDate.getDay()]
    const elapsedDays = Math.floor(
      (date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
    )
    return (
      Math.floor(elapsedDays / 7) % (event.repeatIntervalWeeks ?? 1) === 0 &&
      weekdays.includes(date.getDay())
    )
  }
  if (event.repeat === 'monthly') {
    return date.getDate() === (event.repeatMonthDay ?? startDate.getDate())
  }
  if (event.repeat === 'monthlyWeekday') {
    const weekday = event.repeatMonthlyWeekday ?? startDate.getDay()
    if (date.getDay() !== weekday) return false

    const week = event.repeatMonthlyWeek ?? 'first'
    if (week === 'last') {
      const nextWeek = new Date(date)
      nextWeek.setDate(date.getDate() + 7)
      return nextWeek.getMonth() !== date.getMonth()
    }
    const weekIndex = Math.ceil(date.getDate() / 7)
    const targetWeek = { first: 1, second: 2, third: 3, fourth: 4 }[week]
    return weekIndex === targetWeek
  }
  return false
}
export const isTodoOnDate = (todo: Todo, dateKey: string) => {
  const repeat = todo.repeat ?? 'none'
  if (repeat === 'none') return todo.date === dateKey
  if (dateKey < todo.date) return false

  const date = new Date(`${dateKey}T00:00:00`)
  const startDate = new Date(`${todo.date}T00:00:00`)
  if (repeat === 'daily') return true
  if (repeat === 'weekdays') {
    const weekday = date.getDay()
    return weekday >= 1 && weekday <= 5
  }
  if (repeat === 'weekly') {
    const weekdays = todo.repeatWeekdays?.length
      ? todo.repeatWeekdays
      : [startDate.getDay()]
    const elapsedDays = Math.floor(
      (date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
    )
    return (
      Math.floor(elapsedDays / 7) % (todo.repeatIntervalWeeks ?? 1) === 0 &&
      weekdays.includes(date.getDay())
    )
  }
  if (repeat === 'monthly') {
    return date.getDate() === (todo.repeatMonthDay ?? startDate.getDate())
  }
  if (repeat === 'monthlyWeekday') {
    const weekday = todo.repeatMonthlyWeekday ?? startDate.getDay()
    if (date.getDay() !== weekday) return false
    const week = todo.repeatMonthlyWeek ?? 'first'
    if (week === 'last') {
      const nextWeek = new Date(date)
      nextWeek.setDate(date.getDate() + 7)
      return nextWeek.getMonth() !== date.getMonth()
    }
    const targetWeek = { first: 1, second: 2, third: 3, fourth: 4 }[week]
    return Math.ceil(date.getDate() / 7) === targetWeek
  }
  return false
}
