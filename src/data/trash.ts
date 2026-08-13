import type { CalendarEvent, Todo } from './initialData'

type TrashedPlanBase = {
  trashId: string
  deletedAt: string
}

export type TrashedPlan =
  | (TrashedPlanBase & { type: 'todo'; item: Todo })
  | (TrashedPlanBase & { type: 'event'; item: CalendarEvent })

const deletedAt = (minutesAgo: number) =>
  new Date(Date.now() - minutesAgo * 60 * 1000).toISOString()

export const createInitialTrash = (): TrashedPlan[] => {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const toDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`

  return [
    {
      trashId: 'trash-demo-todo',
      type: 'todo',
      deletedAt: deletedAt(38),
      item: {
        id: 'trash-todo-1',
        date: toDateKey(today),
        text: '지난 회고 메모 정리하기',
        done: false,
        priority: 'low',
        category: '업무',
        dueTime: '17:00',
        reminder: 'none',
        color: 'green',
        note: '공유가 끝난 회고 메모를 정리합니다.',
        project: '팀 운영',
        estimatedMinutes: 20,
      },
    },
    {
      trashId: 'trash-demo-event',
      type: 'event',
      deletedAt: deletedAt(95),
      item: {
        id: 'trash-event-1',
        date: toDateKey(tomorrow),
        title: '취소된 데모 리허설',
        startTime: '16:00',
        endTime: '16:30',
        allDay: false,
        color: 'coral',
        project: '하루 리뉴얼',
        category: '업무',
        location: '온라인 미팅',
        note: '일정 변경으로 취소된 리허설입니다.',
        repeat: 'none',
        reminder: '30m',
      },
    },
  ]
}
