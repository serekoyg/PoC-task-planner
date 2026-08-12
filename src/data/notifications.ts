import { toDateKey } from './initialData'
import type { PlannerTarget } from '../lib/plannerNavigation'

export type PlannerNotification = {
  id: string
  type: 'reminder' | 'todo' | 'study' | 'summary'
  title: string
  description: string
  timeLabel: string
  read: boolean
  target: PlannerTarget
}

export const createInitialNotifications = (): PlannerNotification[] => {
  const today = new Date()

  return [
    {
      id: 'notification-event-1',
      type: 'reminder',
      title: '주간 계획 회의가 30분 후 시작돼요',
      description: '오늘 10:30 · 3층 회의실',
      timeLabel: '방금',
      read: false,
      target: { kind: 'event', id: 'event-1', date: toDateKey(today) },
    },
    {
      id: 'notification-todo-2',
      type: 'todo',
      title: '오늘 마감인 할 일이 있어요',
      description: '캘린더 화면 피드백 남기기 · 오후 3:00',
      timeLabel: '12분 전',
      read: false,
      target: { kind: 'todo', id: 'todo-2' },
    },
    {
      id: 'notification-study-1',
      type: 'study',
      title: '자격증 아침반에 새 일정이 공유됐어요',
      description: '일요일 온라인 회고 · 함께할지 확인해 보세요.',
      timeLabel: '1시간 전',
      read: false,
      target: { kind: 'study', id: 'morning-license' },
    },
    {
      id: 'notification-summary-1',
      type: 'summary',
      title: '이번 주 계획 요약이 준비됐어요',
      description: '완료한 할 일과 남은 일정을 한눈에 확인해 보세요.',
      timeLabel: '어제',
      read: true,
      target: { kind: 'event', id: 'event-1', date: toDateKey(today) },
    },
  ]
}
