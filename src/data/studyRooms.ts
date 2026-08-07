export type StudyMemberStatus = 'studying' | 'resting' | 'offline'

export type StudyMember = {
  id: string
  name: string
  avatar: string
  minutes: number
  status: StudyMemberStatus
  focusLabel: string
  isMe?: boolean
}

export type StudyRoom = {
  id: string
  name: string
  description: string
  category: string
  goal: string
  accent: 'coral' | 'blue' | 'green' | 'violet'
  memberCount: number
  maxMembers: number
  joined: boolean
  inviteOnly: boolean
  todayMinutes: number
  weeklyProgress: number
  streak: number
  members: StudyMember[]
}

export type StudyRoomCreateInput = Pick<
  StudyRoom,
  'name' | 'description' | 'category' | 'goal' | 'maxMembers' | 'inviteOnly'
>

export const createInitialStudyRooms = (): StudyRoom[] => [
  {
    id: 'morning-license',
    name: '자격증 아침반',
    description: '출근 전 조용히 모여 각자 준비하는 아침 집중 모임이에요.',
    category: '자격증',
    goal: '평일 오전 7시, 하루 90분 집중',
    accent: 'coral',
    memberCount: 6,
    maxMembers: 8,
    joined: true,
    inviteOnly: false,
    todayMinutes: 428,
    weeklyProgress: 72,
    streak: 12,
    members: [
      {
        id: 'me',
        name: '민서',
        avatar: '민',
        minutes: 64,
        status: 'resting',
        focusLabel: '정보처리기사 기출 2회',
        isMe: true,
      },
      {
        id: 'member-1',
        name: '도윤',
        avatar: '도',
        minutes: 103,
        status: 'studying',
        focusLabel: '컴퓨터활용능력 실기',
      },
      {
        id: 'member-2',
        name: '소희',
        avatar: '소',
        minutes: 88,
        status: 'studying',
        focusLabel: '한국사 핵심노트 복습',
      },
      {
        id: 'member-3',
        name: '준',
        avatar: '준',
        minutes: 76,
        status: 'resting',
        focusLabel: '토익 단어 5일차',
      },
      {
        id: 'member-4',
        name: '하린',
        avatar: '하',
        minutes: 61,
        status: 'offline',
        focusLabel: '전산회계 오답 정리',
      },
      {
        id: 'member-5',
        name: '이안',
        avatar: '이',
        minutes: 36,
        status: 'offline',
        focusLabel: 'SQLD 개념 복습',
      },
    ],
  },
  {
    id: 'job-routine',
    name: '취준 루틴 30일',
    description: '매일 한 가지 취업 준비를 인증하며 흐름을 이어가요.',
    category: '취업',
    goal: '30일 동안 하루 한 번 체크인',
    accent: 'blue',
    memberCount: 18,
    maxMembers: 24,
    joined: false,
    inviteOnly: false,
    todayMinutes: 962,
    weeklyProgress: 81,
    streak: 23,
    members: [
      {
        id: 'job-1',
        name: '유나',
        avatar: '유',
        minutes: 121,
        status: 'studying',
        focusLabel: '포트폴리오 문장 다듬기',
      },
      {
        id: 'job-2',
        name: '지호',
        avatar: '지',
        minutes: 94,
        status: 'studying',
        focusLabel: '코딩 테스트 2문제',
      },
      {
        id: 'job-3',
        name: '서아',
        avatar: '서',
        minutes: 72,
        status: 'resting',
        focusLabel: '기업 분석 노트',
      },
    ],
  },
  {
    id: 'side-project',
    name: '사이드 프로젝트 몰입반',
    description: '만들고 싶은 것을 미루지 않도록 주 4회 함께 몰입해요.',
    category: '프로젝트',
    goal: '주 4회, 회당 2시간 메이커 타임',
    accent: 'violet',
    memberCount: 9,
    maxMembers: 12,
    joined: false,
    inviteOnly: false,
    todayMinutes: 611,
    weeklyProgress: 64,
    streak: 8,
    members: [
      {
        id: 'side-1',
        name: '태오',
        avatar: '태',
        minutes: 148,
        status: 'studying',
        focusLabel: '랜딩 페이지 구현',
      },
      {
        id: 'side-2',
        name: '은',
        avatar: '은',
        minutes: 112,
        status: 'resting',
        focusLabel: '사용자 인터뷰 정리',
      },
    ],
  },
  {
    id: 'english-hour',
    name: '영어 매일 1시간',
    description: '회화, 단어, 리딩 무엇이든 영어와 매일 한 시간 만나기.',
    category: '어학',
    goal: '매일 영어 공부 60분 채우기',
    accent: 'green',
    memberCount: 29,
    maxMembers: 40,
    joined: false,
    inviteOnly: false,
    todayMinutes: 1380,
    weeklyProgress: 88,
    streak: 41,
    members: [
      {
        id: 'english-1',
        name: '나래',
        avatar: '나',
        minutes: 83,
        status: 'studying',
        focusLabel: '쉐도잉 3회 반복',
      },
      {
        id: 'english-2',
        name: '현우',
        avatar: '현',
        minutes: 74,
        status: 'studying',
        focusLabel: '영자신문 읽기',
      },
    ],
  },
]
