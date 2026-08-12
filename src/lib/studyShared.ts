import type {
  StudySharedItem,
  StudySharedItemType,
} from '../data/studyRooms'

export const sharedItemTypeLabels: Record<StudySharedItemType, string> = {
  todo: '함께할 일',
  event: '공동 일정',
}

export const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']
export const monthWeekLabels = {
  first: '첫째',
  second: '둘째',
  third: '셋째',
  fourth: '넷째',
  last: '마지막',
} as const

export const getSharedRepeatLabel = (item: StudySharedItem) => {
  if (item.repeat === 'daily') return '매일 반복'
  if (item.repeat === 'weekdays') return '평일 반복'
  if (item.repeat === 'weekly') {
    const weekdays = item.repeatWeekdays?.length
      ? item.repeatWeekdays
      : [new Date(`${item.date}T00:00:00`).getDay()]
    return `${item.repeatIntervalWeeks ?? 1}주마다 ${weekdays.map((weekday) => weekdayLabels[weekday]).join('·')}요일`
  }
  if (item.repeat === 'monthly') {
    return `매월 ${item.repeatMonthDay ?? new Date(`${item.date}T00:00:00`).getDate()}일`
  }
  if (item.repeat === 'monthlyWeekday') {
    const week = item.repeatMonthlyWeek ?? 'first'
    const weekday = item.repeatMonthlyWeekday ?? new Date(`${item.date}T00:00:00`).getDay()
    return `매월 ${monthWeekLabels[week]} ${weekdayLabels[weekday]}요일`
  }
  return '반복 없음'
}

export const isSharedItemOnDate = (item: StudySharedItem, dateKey: string) => {
  if (item.repeat === 'none') return item.date === dateKey
  if (dateKey < item.date) return false

  const date = new Date(`${dateKey}T00:00:00`)
  if (item.repeat === 'daily') return true
  if (item.repeat === 'weekdays') {
    const weekday = date.getDay()
    return weekday >= 1 && weekday <= 5
  }
  if (item.repeat === 'weekly') {
    const weekdays = item.repeatWeekdays?.length
      ? item.repeatWeekdays
      : [new Date(`${item.date}T00:00:00`).getDay()]
    const startDate = new Date(`${item.date}T00:00:00`)
    const elapsedDays = Math.floor(
      (date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
    )
    const elapsedWeeks = Math.floor(elapsedDays / 7)
    return (
      elapsedWeeks % (item.repeatIntervalWeeks ?? 1) === 0 &&
      weekdays.includes(date.getDay())
    )
  }
  if (item.repeat === 'monthly') {
    return date.getDate() === (
      item.repeatMonthDay ?? new Date(`${item.date}T00:00:00`).getDate()
    )
  }
  if (item.repeat === 'monthlyWeekday') {
    const weekday = item.repeatMonthlyWeekday ?? new Date(`${item.date}T00:00:00`).getDay()
    if (date.getDay() !== weekday) return false

    const week = item.repeatMonthlyWeek ?? 'first'
    if (week === 'last') {
      const nextWeek = new Date(date)
      nextWeek.setDate(date.getDate() + 7)
      return nextWeek.getMonth() !== date.getMonth()
    }
    const weekIndex = Math.ceil(date.getDate() / 7)
    const targetWeek = { first: 1, second: 2, third: 3, fourth: 4 }[week]
    return weekIndex === targetWeek
  }
  return item.date === dateKey
}
