export type StudyMemberStatus = 'studying' | 'resting' | 'offline'
export type StudyProfileVisibility = 'public' | 'roomMembers' | 'private'
export type StudyRoomVisibility = 'public' | 'private'

export type StudyMember = {
  id: string
  name: string
  avatar: string
  minutes: number
  status: StudyMemberStatus
  focusLabel: string
  isMe?: boolean
  weeklyMinutes?: number[]
  profileVisibility?: StudyProfileVisibility
  bio?: string
}

export type StudySharedItemType = 'todo' | 'event'
export type StudySharedRepeat =
  | 'none'
  | 'daily'
  | 'weekdays'
  | 'weekly'
  | 'monthly'
  | 'monthlyWeekday'
export type StudySharedMonthWeek = 'first' | 'second' | 'third' | 'fourth' | 'last'

export type StudySharedItem = {
  id: string
  type: StudySharedItemType
  title: string
  date: string
  time?: string
  endTime?: string
  location?: string
  repeat: StudySharedRepeat
  repeatWeekdays?: number[]
  repeatIntervalWeeks?: number
  repeatMonthDay?: number
  repeatMonthlyWeek?: StudySharedMonthWeek
  repeatMonthlyWeekday?: number
  repeatEnd?: 'never' | 'count' | 'date'
  repeatCount?: number
  repeatEndDate?: string
  note: string
  createdById: string
  completedMemberIds: string[]
  completedAtByMember?: Record<string, string>
  participantMemberIds: string[]
}

export type StudyChatMessage = {
  id: string
  memberId: string
  text: string
  createdAt: string
}

export type StudySharedItemInput = Omit<
  StudySharedItem,
  | 'id'
  | 'createdById'
  | 'completedMemberIds'
  | 'completedAtByMember'
  | 'participantMemberIds'
>

export type StudySharedItemEntry = {
  roomId: string
  roomName: string
  memberId: string
  canManage: boolean
  item: StudySharedItem
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
  visibility?: StudyRoomVisibility
  todayMinutes: number
  weeklyProgress: number
  streak: number
  ownerId: string
  managerIds: string[]
  allowMemberSharing: boolean
  sharedItems: StudySharedItem[]
  chatMessages: StudyChatMessage[]
  members: StudyMember[]
}

const weeklyPatterns = [
  [0.68, 1.05, 0.82, 1.12, 1, 0, 0],
  [1.18, 0.74, 1.06, 0.9, 1, 0, 0],
  [0.54, 0.92, 1.14, 0.7, 1, 0, 0],
  [0.88, 1.08, 0.62, 1.2, 1, 0, 0],
]

const createWeeklyMinutes = (todayMinutes: number, seed: number) => {
  const pattern = weeklyPatterns[seed % weeklyPatterns.length]
  return pattern.map((weight) => Math.round(todayMinutes * weight))
}

const createCompletionTimestamp = (
  date: string,
  itemIndex: number,
  memberIndex: number,
) => {
  const hour = 9 + ((itemIndex * 2 + memberIndex * 2) % 10)
  const minute = (18 + itemIndex * 9 + memberIndex * 17) % 60
  return new Date(
    `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+09:00`,
  ).toISOString()
}

export const normalizeStudyRooms = (rooms: StudyRoom[]): StudyRoom[] =>
  rooms.map((room, roomIndex) => ({
    ...room,
    visibility: room.visibility ?? 'public',
    ownerId: room.ownerId ?? room.members?.[0]?.id ?? '',
    managerIds: room.managerIds ?? [],
    allowMemberSharing: room.allowMemberSharing ?? true,
    sharedItems: (room.sharedItems ?? []).map((item, itemIndex) => ({
      ...item,
      completedAtByMember: item.completedMemberIds.reduce<Record<string, string>>(
        (timestamps, memberId, memberIndex) => ({
          ...timestamps,
          [memberId]:
            item.completedAtByMember?.[memberId] ??
            createCompletionTimestamp(item.date, itemIndex, memberIndex),
        }),
        {},
      ),
    })),
    chatMessages: room.chatMessages ?? [],
    members: (room.members ?? []).map((member, memberIndex) => ({
      ...member,
      weeklyMinutes:
        member.weeklyMinutes?.length === 7
          ? member.weeklyMinutes.map((minutes) => Math.max(0, minutes))
          : createWeeklyMinutes(member.minutes, roomIndex + memberIndex),
      profileVisibility:
        member.profileVisibility ??
        (member.isMe
          ? 'roomMembers'
          : memberIndex === 5
            ? 'private'
            : memberIndex === 4
              ? 'roomMembers'
              : 'public'),
      bio:
        member.bio ??
        (member.isMe
          ? '매일 조금씩 꾸준하게 이어가고 있어요.'
          : `${room.name}에서 함께 활동하고 있어요.`),
    })),
  }))

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
    ownerId: 'me',
    managerIds: ['member-1'],
    allowMemberSharing: true,
    sharedItems: [
      {
        id: 'shared-morning-1',
        type: 'todo',
        title: '이번 주 기출문제 2회 풀기',
        date: '2026-08-14',
        repeat: 'none',
        note: '과목은 달라도 괜찮아요. 각자 필요한 기출문제를 풀고 완료해요.',
        createdById: 'me',
        completedMemberIds: ['me', 'member-1', 'member-2'],
        participantMemberIds: [],
      },
      {
        id: 'shared-morning-2',
        type: 'event',
        title: '일요일 온라인 회고',
        date: '2026-08-16',
        time: '20:30',
        endTime: '21:10',
        repeat: 'none',
        note: '이번 주에 잘된 점 하나와 다음 주 목표를 나눠요.',
        createdById: 'member-1',
        completedMemberIds: [],
        participantMemberIds: ['me', 'member-1', 'member-2', 'member-3'],
      },
      {
        id: 'shared-morning-3',
        type: 'todo',
        title: '오답노트 한 페이지 인증',
        date: '2026-08-12',
        repeat: 'none',
        note: '완벽하게 정리하기보다 한 페이지를 채우는 데 집중해요.',
        createdById: 'member-2',
        completedMemberIds: ['member-2', 'member-3'],
        participantMemberIds: [],
      },
      {
        id: 'shared-morning-4',
        type: 'todo',
        title: '평일 아침 30분 활동 인증',
        date: '2026-08-11',
        repeat: 'weekly',
        repeatWeekdays: [1, 2, 3, 4, 5],
        repeatIntervalWeeks: 1,
        note: '공부, 운동, 정리 등 오늘 이어갈 활동을 30분 실천해요.',
        createdById: 'me',
        completedMemberIds: ['member-1', 'member-4'],
        participantMemberIds: [],
      },
    ],
    chatMessages: [
      {
        id: 'chat-morning-1',
        memberId: 'member-1',
        text: '오늘도 각자 목표만큼 가볍게 시작해봐요!',
        createdAt: '2026-08-12T07:03:00+09:00',
      },
      {
        id: 'chat-morning-2',
        memberId: 'me',
        text: '좋아요. 저는 기출문제부터 풀게요.',
        createdAt: '2026-08-12T07:05:00+09:00',
      },
    ],
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
    ownerId: 'job-1',
    managerIds: ['job-2'],
    allowMemberSharing: true,
    sharedItems: [],
    chatMessages: [],
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
    ownerId: 'side-1',
    managerIds: [],
    allowMemberSharing: true,
    sharedItems: [
      {
        id: 'shared-side-1',
        type: 'event',
        title: '금요일 데모 공유',
        date: '2026-08-14',
        time: '21:00',
        endTime: '22:00',
        repeat: 'none',
        note: '이번 주에 만든 화면이나 고민을 10분씩 공유해요.',
        createdById: 'side-1',
        completedMemberIds: [],
        participantMemberIds: ['side-1'],
      },
    ],
    chatMessages: [
      {
        id: 'chat-side-1',
        memberId: 'side-1',
        text: '금요일 데모에서 이번 주 작업을 짧게 공유해요.',
        createdAt: '2026-08-11T20:12:00+09:00',
      },
    ],
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
    ownerId: 'english-1',
    managerIds: [],
    allowMemberSharing: true,
    sharedItems: [],
    chatMessages: [],
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
