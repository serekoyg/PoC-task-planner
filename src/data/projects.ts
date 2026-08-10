export type ProjectAccent = 'coral' | 'blue' | 'green' | 'violet'

export type PlannerProject = {
  id: string
  name: string
  description: string
  accent: ProjectAccent
  goal: string
}

export type ProjectCategory = {
  id: string
  name: string
  icon: string
  projects: PlannerProject[]
}

export type ProjectCreateInput = {
  categoryId: string
  name: string
  description: string
  accent: ProjectAccent
}

export const createInitialProjectCategories = (): ProjectCategory[] => [
  {
    id: 'work',
    name: '업무',
    icon: '▦',
    projects: [
      {
        id: 'haru-renewal',
        name: '하루 리뉴얼',
        description: '일정과 할 일을 더 자연스럽게 연결하는 화면을 만들어요.',
        accent: 'coral',
        goal: '이번 주 프로토타입 검토 완료',
      },
      {
        id: 'team-operations',
        name: '팀 운영',
        description: '회의와 공유할 내용을 한곳에서 준비해요.',
        accent: 'blue',
        goal: '주간 회의 준비와 결정사항 공유',
      },
    ],
  },
  {
    id: 'personal',
    name: '개인',
    icon: '⌂',
    projects: [
      {
        id: 'weekly-plan',
        name: '주간 계획',
        description: '이번 주 중요한 일을 정하고 매일 가볍게 확인해요.',
        accent: 'green',
        goal: '매주 월요일 우선순위 세 가지 정하기',
      },
      {
        id: 'license-prep',
        name: '자격증 준비',
        description: '시험일까지 공부할 범위와 집중 시간을 관리해요.',
        accent: 'violet',
        goal: '평일 하루 90분 집중',
      },
    ],
  },
]
