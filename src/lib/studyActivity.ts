import type { StudyMember } from '../data/studyRooms'

export const studyWeekdays = ['월', '화', '수', '목', '금', '토', '일'] as const

export const getMemberWeeklyMinutes = (member: StudyMember) =>
  Array.from({ length: 7 }, (_, index) => member.weeklyMinutes?.[index] ?? 0)

export const getActivityLevel = (minutes: number) => {
  if (minutes <= 0) return 0
  if (minutes < 30) return 1
  if (minutes < 60) return 2
  if (minutes < 90) return 3
  return 4
}

export const getWeeklyActivitySummary = (member: StudyMember) => {
  const minutes = getMemberWeeklyMinutes(member)
  return {
    minutes,
    totalMinutes: minutes.reduce((total, value) => total + value, 0),
    activeDays: minutes.filter((value) => value > 0).length,
  }
}
