import type {
  StudySharedItem,
  StudySharedItemType,
} from '../data/studyRooms'
import { isRepeatingPlanOnDate } from './recurrence'

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

export const getWeekdaySelectionLabel = (weekdays: number[]) => {
  if (weekdays.length === 7) return '매일'
  if (
    weekdays.length === 5 &&
    [1, 2, 3, 4, 5].every((weekday) => weekdays.includes(weekday))
  ) return '평일'
  if (!weekdays.length) return '요일을 선택해 주세요'
  return weekdays.map((weekday) => weekdayLabels[weekday]).join('·') + '요일'
}

const getRepeatEndLabel = (item: StudySharedItem) => {
  if (item.repeatEnd === 'count' && item.repeatCount) return ` · ${item.repeatCount}회`
  if (item.repeatEnd === 'date' && item.repeatEndDate) {
    const date = new Date(`${item.repeatEndDate}T00:00:00`)
    return ` · ${date.getMonth() + 1}월 ${date.getDate()}일까지`
  }
  return ''
}

export const getSharedRepeatLabel = (item: StudySharedItem) => {
  const endLabel = getRepeatEndLabel(item)
  if (item.repeat === 'daily') return `매일 반복${endLabel}`
  if (item.repeat === 'weekdays') return `평일 반복${endLabel}`
  if (item.repeat === 'weekly') {
    const weekdays = item.repeatWeekdays?.length
      ? item.repeatWeekdays
      : [new Date(`${item.date}T00:00:00`).getDay()]
    return `${item.repeatIntervalWeeks ?? 1}주마다 ${getWeekdaySelectionLabel(weekdays)}${endLabel}`
  }
  if (item.repeat === 'monthly') {
    return `매월 ${item.repeatMonthDay ?? new Date(`${item.date}T00:00:00`).getDate()}일${endLabel}`
  }
  if (item.repeat === 'monthlyWeekday') {
    const week = item.repeatMonthlyWeek ?? 'first'
    const weekday = item.repeatMonthlyWeekday ?? new Date(`${item.date}T00:00:00`).getDay()
    return `매월 ${monthWeekLabels[week]} ${weekdayLabels[weekday]}요일${endLabel}`
  }
  return '반복 없음'
}

export const isSharedItemOnDate = (item: StudySharedItem, dateKey: string) => {
  return isRepeatingPlanOnDate(item, dateKey)
}
