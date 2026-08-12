export type RepeatablePlan = {
  date: string
  repeat?: 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'monthlyWeekday'
  repeatWeekdays?: number[]
  repeatIntervalWeeks?: number
  repeatMonthDay?: number
  repeatMonthlyWeek?: 'first' | 'second' | 'third' | 'fourth' | 'last'
  repeatMonthlyWeekday?: number
  repeatEnd?: 'never' | 'count' | 'date'
  repeatCount?: number
  repeatEndDate?: string
}

const DAY_IN_MS = 24 * 60 * 60 * 1000

const matchesPattern = (plan: RepeatablePlan, dateKey: string) => {
  const repeat = plan.repeat ?? 'none'
  if (repeat === 'none') return plan.date === dateKey
  if (dateKey < plan.date) return false

  const date = new Date(`${dateKey}T00:00:00`)
  const startDate = new Date(`${plan.date}T00:00:00`)
  if (repeat === 'daily') return true
  if (repeat === 'weekdays') {
    const weekday = date.getDay()
    return weekday >= 1 && weekday <= 5
  }
  if (repeat === 'weekly') {
    const weekdays = plan.repeatWeekdays?.length
      ? plan.repeatWeekdays
      : [startDate.getDay()]
    const elapsedDays = Math.floor(
      (date.getTime() - startDate.getTime()) / DAY_IN_MS,
    )
    return (
      Math.floor(elapsedDays / 7) % (plan.repeatIntervalWeeks ?? 1) === 0 &&
      weekdays.includes(date.getDay())
    )
  }
  if (repeat === 'monthly') {
    return date.getDate() === (plan.repeatMonthDay ?? startDate.getDate())
  }
  if (repeat === 'monthlyWeekday') {
    const weekday = plan.repeatMonthlyWeekday ?? startDate.getDay()
    if (date.getDay() !== weekday) return false
    const week = plan.repeatMonthlyWeek ?? 'first'
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

const getOccurrenceNumber = (plan: RepeatablePlan, dateKey: string) => {
  const start = new Date(`${plan.date}T00:00:00`)
  const target = new Date(`${dateKey}T00:00:00`)
  let occurrence = 0

  for (const current = new Date(start); current <= target; current.setDate(current.getDate() + 1)) {
    const currentKey = [
      current.getFullYear(),
      String(current.getMonth() + 1).padStart(2, '0'),
      String(current.getDate()).padStart(2, '0'),
    ].join('-')
    if (matchesPattern(plan, currentKey)) occurrence += 1
  }

  return occurrence
}

export const isRepeatingPlanOnDate = (plan: RepeatablePlan, dateKey: string) => {
  if (!matchesPattern(plan, dateKey)) return false
  if ((plan.repeat ?? 'none') === 'none') return true

  if (plan.repeatEnd === 'date' && plan.repeatEndDate) {
    return dateKey <= plan.repeatEndDate
  }
  if (plan.repeatEnd === 'count' && plan.repeatCount) {
    return getOccurrenceNumber(plan, dateKey) <= plan.repeatCount
  }
  return true
}
