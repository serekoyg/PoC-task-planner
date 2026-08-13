export type Todo = {
  id: string
  date: string
  text: string
  done: boolean
  priority: 'high' | 'medium' | 'low'
  category?: '개인' | '업무' | '공부' | '운동' | '기타'
  dueTime: string
  reminder: 'none' | '10m' | '30m' | '1h' | '1d'
  color: 'coral' | 'blue' | 'green'
  note: string
  project?: string
  estimatedMinutes?: number
  memo?: string
  repeat?: CalendarEvent['repeat']
  repeatWeekdays?: number[]
  repeatIntervalWeeks?: number
  repeatMonthDay?: number
  repeatMonthlyWeek?: CalendarEvent['repeatMonthlyWeek']
  repeatMonthlyWeekday?: number
  repeatEnd?: 'never' | 'count' | 'date'
  repeatCount?: number
  repeatEndDate?: string
}

export type TodoInput = Omit<Todo, 'id' | 'done'>

export type CalendarEvent = {
  id: string
  date: string
  title: string
  startTime: string
  endTime: string
  allDay: boolean
  color: 'coral' | 'blue' | 'green'
  project?: string
  category?: '개인' | '업무' | '약속' | '운동' | '기타'
  location: string
  note: string
  repeat:
    | 'none'
    | 'daily'
    | 'weekdays'
    | 'weekly'
    | 'monthly'
    | 'monthlyWeekday'
  repeatMonthlyWeek?: 'first' | 'second' | 'third' | 'fourth' | 'last'
  repeatMonthlyWeekday?: number
  repeatWeekdays?: number[]
  repeatIntervalWeeks?: number
  repeatMonthDay?: number
  repeatEnd?: 'never' | 'count' | 'date'
  repeatCount?: number
  repeatEndDate?: string
  reminder: 'none' | '10m' | '30m' | '1h' | '1d'
  time?: string
}

export type CalendarEventInput = Omit<CalendarEvent, 'id' | 'time'>

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

export const createInitialTodos = (): Todo[] => {
  const today = new Date()

  return [
    {
      id: 'todo-1',
      date: toDateKey(today),
      text: '이번 주 우선순위 정리하기',
      done: true,
      priority: 'high',
      category: '업무',
      dueTime: '10:00',
      reminder: '30m',
      color: 'coral',
      note: '이번 주에 꼭 끝낼 세 가지를 먼저 정리합니다.',
      project: '주간 계획',
      estimatedMinutes: 20,
      memo: '이번 주에 꼭 끝내야 하는 일 세 가지를 먼저 정리해요.',
    },
    {
      id: 'todo-2',
      date: toDateKey(today),
      text: '캘린더 화면 피드백 남기기',
      done: false,
      priority: 'medium',
      category: '업무',
      dueTime: '15:00',
      reminder: '1h',
      color: 'blue',
      note: '날짜 선택 흐름과 일정 카드의 정보 순서를 중심으로 살펴봐요.',
      project: '하루 리뉴얼',
      estimatedMinutes: 45,
    },
    {
      id: 'todo-3',
      date: toDateKey(today),
      text: '오후 회의 자료 훑어보기',
      done: false,
      priority: 'low',
      category: '업무',
      dueTime: '13:30',
      reminder: 'none',
      color: 'green',
      note: '결정이 필요한 항목에는 미리 표시를 남겨요.',
      project: '팀 운영',
      estimatedMinutes: 30,
    },
    {
      id: 'todo-4',
      date: toDateKey(addDays(today, 1)),
      text: '프로토타입 검토 결과 공유하기',
      done: false,
      priority: 'high',
      category: '업무',
      dueTime: '11:00',
      reminder: '30m',
      color: 'coral',
      note: '결정된 내용과 다음 실험 항목을 함께 공유합니다.',
      project: '하루 리뉴얼',
      estimatedMinutes: 35,
    },
  ]
}

export const createInitialEvents = (): CalendarEvent[] => {
  const today = new Date()

  return [
    {
      id: 'event-1',
      date: toDateKey(today),
      title: '주간 계획 회의',
      startTime: '10:30',
      endTime: '11:30',
      allDay: false,
      color: 'coral',
      project: '주간 계획',
      category: '업무',
      location: '3층 회의실',
      note: '이번 주 우선순위와 담당 업무를 정리합니다.',
      repeat: 'weekly',
      reminder: '30m',
    },
    {
      id: 'event-2',
      date: toDateKey(addDays(today, 2)),
      title: '화면 프로토타입 리뷰',
      startTime: '14:00',
      endTime: '15:30',
      allDay: false,
      color: 'blue',
      project: '하루 리뉴얼',
      category: '업무',
      location: '온라인 미팅',
      note: '주요 화면 흐름과 다음 실험 범위를 확인합니다.',
      repeat: 'none',
      reminder: '10m',
    },
    {
      id: 'event-3',
      date: toDateKey(addDays(today, 5)),
      title: '다음 스프린트 정리',
      startTime: '16:30',
      endTime: '17:30',
      allDay: false,
      color: 'green',
      project: '팀 운영',
      category: '업무',
      location: '',
      note: '',
      repeat: 'none',
      reminder: '1h',
    },
    {
      id: 'event-4',
      date: toDateKey(addDays(today, -3)),
      title: '아이디어 공유',
      startTime: '11:00',
      endTime: '12:00',
      allDay: false,
      color: 'blue',
      project: '하루 리뉴얼',
      category: '약속',
      location: '라운지',
      note: '',
      repeat: 'none',
      reminder: '30m',
    },
  ]
}
