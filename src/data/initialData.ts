export type Todo = {
  id: string
  text: string
  done: boolean
}

export type CalendarEvent = {
  id: string
  date: string
  title: string
  time: string
  color: 'coral' | 'blue' | 'green'
}

export const toDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export const createInitialTodos = (): Record<string, Todo[]> => {
  const today = new Date()

  return {
    [toDateKey(today)]: [
      { id: 'todo-1', text: '이번 주 우선순위 정리하기', done: true },
      { id: 'todo-2', text: '캘린더 화면 피드백 남기기', done: false },
      { id: 'todo-3', text: '오후 회의 자료 훑어보기', done: false },
    ],
    [toDateKey(addDays(today, 1))]: [
      { id: 'todo-4', text: '프로토타입 검토 결과 공유하기', done: false },
    ],
  }
}

export const createInitialEvents = (): CalendarEvent[] => {
  const today = new Date()

  return [
    {
      id: 'event-1',
      date: toDateKey(today),
      title: '주간 계획 회의',
      time: '10:30',
      color: 'coral',
    },
    {
      id: 'event-2',
      date: toDateKey(addDays(today, 2)),
      title: '화면 프로토타입 리뷰',
      time: '14:00',
      color: 'blue',
    },
    {
      id: 'event-3',
      date: toDateKey(addDays(today, 5)),
      title: '다음 스프린트 정리',
      time: '16:30',
      color: 'green',
    },
    {
      id: 'event-4',
      date: toDateKey(addDays(today, -3)),
      title: '아이디어 공유',
      time: '11:00',
      color: 'blue',
    },
  ]
}
