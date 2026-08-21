import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  CalendarBlank,
  CheckSquare,
  ListChecks,
  MapPin,
} from '@phosphor-icons/react'
import FocusToggleButton from '../components/FocusToggleButton'
import PlanEditorModal from '../components/PlanEditorModal'
import StudyRoomChat from '../components/StudyRoomChat'
import type {
  FocusRecord,
  FocusRecordContext,
  FocusSourceType,
} from '../data/focusRecords'
import { toDateKey } from '../data/initialData'
import type {
  StudyMemberStatus,
  StudyRoom,
  StudySharedItem,
  StudySharedItemInput,
  StudySharedItemType,
} from '../data/studyRooms'
import {
  getSharedRepeatLabel,
  sharedItemTypeLabels,
} from '../lib/studyShared'
import {
  formatFocusTimer,
  getFocusDurationSeconds,
  isFocusRecordRunning,
} from '../lib/focus'
import {
  getActivityLevel,
  getWeeklyActivitySummary,
  studyWeekdays,
} from '../lib/studyActivity'

type StudyRoomDetailPageProps = {
  room?: StudyRoom
  focusRecords: FocusRecord[]
  nowMs: number
  onRequestJoin: (roomId: string) => void
  onChangeRoom: (
    roomId: string,
    update: (current: StudyRoom) => StudyRoom,
  ) => void
  onStartFocus: (
    sourceType: FocusSourceType,
    sourceId: string,
    title: string,
    context?: FocusRecordContext,
  ) => void
  onPauseFocus: (recordId: string) => void
}

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours ? `${hours}시간 ${rest}분` : `${rest}분`
}

const statusLabels: Record<StudyMemberStatus, string> = {
  studying: '활동 중',
  resting: '쉬는 중',
  offline: '오늘 참여',
}

const formatSharedDate = (item: StudySharedItem) => {
  const date = new Date(`${item.date}T00:00:00`)
  const label = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
  if (item.type === 'event' && item.time) {
    return `${label}${item.repeat !== 'none' ? ' 시작' : ''} · ${item.time}${item.endTime ? `–${item.endTime}` : ''}`
  }
  if (item.repeat !== 'none') return `${label} 시작`
  return `${label}까지`
}

const formatCompletedAt = (completedAt?: string) => {
  if (!completedAt) return '완료 시간 기록 없음'
  const date = new Date(completedAt)
  if (Number.isNaN(date.getTime())) return '완료 시간 기록 없음'
  return `${new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)} 완료`
}

type StudyRoomTab = 'home' | 'plans' | 'chat'
type SharedPlanFilter = 'all' | StudySharedItemType
type SharedPlanGroupKey = 'now' | 'today' | 'week' | 'upcoming' | 'past'

const sharedPlanFilters: Array<{
  value: SharedPlanFilter
  label: string
}> = [
  { value: 'all', label: '전체' },
  { value: 'event', label: '일정' },
  { value: 'todo', label: '할 일' },
]

const sharedPlanGroupLabels: Record<SharedPlanGroupKey, string> = {
  now: '지금',
  today: '오늘',
  week: '이번 주',
  upcoming: '예정',
  past: '지난 계획',
}

const sharedPlanGroupOrder: SharedPlanGroupKey[] = [
  'now',
  'today',
  'week',
  'upcoming',
  'past',
]

export default function StudyRoomDetailPage({
  room,
  focusRecords,
  nowMs,
  onRequestJoin,
  onChangeRoom,
  onStartFocus,
  onPauseFocus,
}: StudyRoomDetailPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<StudyRoomTab>('home')
  const [planFilter, setPlanFilter] = useState<SharedPlanFilter>('all')
  const [isPlanEditorOpen, setIsPlanEditorOpen] = useState(false)
  const [viewingStatusItemId, setViewingStatusItemId] = useState<string>()
  const roomFocusRecords = useMemo(
    () =>
      focusRecords.filter(
        (record) =>
          record.sourceType === 'study' &&
          (record.roomId === room?.id || record.sourceId === room?.id),
      ),
    [focusRecords, room?.id],
  )
  const activeRoomFocus = roomFocusRecords.find(
    (record) => isFocusRecordRunning(record),
  )
  const rankedMembers = useMemo(
    () => [...(room?.members ?? [])].sort((a, b) => b.minutes - a.minutes),
    [room],
  )
  const todayKey = toDateKey(new Date(nowMs))
  const sharedPlanGroups = useMemo(() => {
    const weekEnd = new Date(`${todayKey}T00:00:00`)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const weekEndKey = toDateKey(weekEnd)
    const groups = new Map<SharedPlanGroupKey, StudySharedItem[]>()

    ;(room?.sharedItems ?? [])
      .filter((item) => planFilter === 'all' || item.type === planFilter)
      .sort((first, second) => {
        const dateOrder = first.date.localeCompare(second.date)
        if (dateOrder) return dateOrder
        return (first.time ?? '23:59').localeCompare(second.time ?? '23:59')
      })
      .forEach((item) => {
        const focusRecord = roomFocusRecords.find(
          (record) => record.sourceId === item.id,
        )
        let groupKey: SharedPlanGroupKey
        if (focusRecord && isFocusRecordRunning(focusRecord)) {
          groupKey = 'now'
        } else if (item.date === todayKey || (item.repeat !== 'none' && item.date < todayKey)) {
          groupKey = 'today'
        } else if (item.date > todayKey && item.date <= weekEndKey) {
          groupKey = 'week'
        } else if (item.date > weekEndKey) {
          groupKey = 'upcoming'
        } else {
          groupKey = 'past'
        }
        groups.set(groupKey, [...(groups.get(groupKey) ?? []), item])
      })

    return sharedPlanGroupOrder
      .map((key) => ({ key, items: groups.get(key) ?? [] }))
      .filter((group) => group.items.length > 0)
  }, [planFilter, room?.sharedItems, roomFocusRecords, todayKey])

  useEffect(() => {
    const shouldOpenPlans =
      searchParams.get('tab') === 'plans' || searchParams.has('startActivity')
    if (!shouldOpenPlans) return

    setActiveTab('plans')

    if (searchParams.has('startActivity')) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('startActivity')
      nextParams.set('tab', 'plans')
      setSearchParams(nextParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!viewingStatusItemId) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setViewingStatusItemId(undefined)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [viewingStatusItemId])

  if (!room) {
    return (
      <main className="study-page study-room-missing">
        <span aria-hidden="true">?</span>
        <h1>모임을 찾을 수 없어요.</h1>
        <p>방이 삭제되었거나 주소가 변경되었을 수 있어요.</p>
        <Link to="/studies">모임 라운지로 돌아가기</Link>
      </main>
    )
  }

  if (!room.joined && room.visibility === 'private') {
    return (
      <main className="study-page study-room-private">
        <Link className="study-back-link" to="/studies">
          <span aria-hidden="true">←</span> 모임 라운지
        </Link>
        <section>
          <span aria-hidden="true">🔒</span>
          <div>
            <p className="eyebrow">비공개 모임</p>
            <h1>멤버만 모임 정보를 볼 수 있어요.</h1>
            <p>초대받은 계정으로 참여하면 활동과 공동 계획을 확인할 수 있어요.</p>
          </div>
        </section>
      </main>
    )
  }

  const liveMembers = room.members.filter(
    (member) => member.status === 'studying',
  ).length
  const me = room.members.find((member) => member.isMe)
  const pendingJoinRequest = room.joinRequests.find(
    (request) => request.applicantId === 'me',
  )
  const hasManagementRole = Boolean(
    me && (room.ownerId === me.id || room.managerIds.includes(me.id)),
  )
  const canCreatePlan = Boolean(
    room.joined && me && (hasManagementRole || room.allowMemberSharing),
  )
  const viewingStatusItem = room.sharedItems.find(
    (item) => item.id === viewingStatusItemId,
  )

  const changeSharedItemStatus = (itemId: string) => {
    if (!me) return
    onChangeRoom(room.id, (current) => ({
      ...current,
      sharedItems: current.sharedItems.map((item) => {
        if (item.id !== itemId) return item
        const memberIds =
          item.type === 'event'
            ? item.participantMemberIds
            : item.completedMemberIds
        const nextMemberIds = memberIds.includes(me.id)
          ? memberIds.filter((memberId) => memberId !== me.id)
          : [...memberIds, me.id]
        if (item.type === 'event') {
          return { ...item, participantMemberIds: nextMemberIds }
        }
        const nextCompletedAtByMember = { ...item.completedAtByMember }
        if (memberIds.includes(me.id)) {
          delete nextCompletedAtByMember[me.id]
        } else {
          nextCompletedAtByMember[me.id] = new Date().toISOString()
        }
        return {
          ...item,
          completedMemberIds: nextMemberIds,
          completedAtByMember: nextCompletedAtByMember,
        }
      }),
    }))
  }

  const saveSharedItem = (input: StudySharedItemInput) => {
    if (!me) return
    onChangeRoom(room.id, (current) => ({
      ...current,
      sharedItems: [
        {
          id: `shared-${crypto.randomUUID()}`,
          ...input,
          createdById: me.id,
          completedMemberIds: [],
          completedAtByMember: {},
          participantMemberIds: [],
        },
        ...current.sharedItems,
      ],
    }))
    setIsPlanEditorOpen(false)
  }

  const sendChatMessage = (text: string) => {
    if (!me) return
    onChangeRoom(room.id, (current) => ({
      ...current,
      chatMessages: [
        ...current.chatMessages,
        {
          id: `chat-${crypto.randomUUID()}`,
          memberId: me.id,
          text,
          createdAt: new Date().toISOString(),
        },
      ],
    }))
  }

  return (
    <main className={`study-page study-detail-page tab-${activeTab}`}>
      <div className="study-detail-topline">
        <Link className="study-back-link" to="/studies">
          <span aria-hidden="true">←</span> 모임 라운지
        </Link>
        {room.joined && (
          <Link className="study-manage-link" to={`/studies/${room.id}/manage`}>
            <span aria-hidden="true">⚙</span> 모임 관리
          </Link>
        )}
      </div>

      <section className={`study-detail-hero ${room.accent}`}>
        <div>
          <div className="study-detail-badges">
            <span>분류 · {room.category}</span>
            <span className="study-detail-live">
              <i aria-hidden="true" /> {liveMembers}명 활동 중
            </span>
          </div>
          <h1>{room.name}</h1>
          <p>{room.description}</p>
        </div>

        <div className="study-detail-summary" aria-label="모임 현황">
          <div>
            <span>오늘 함께한 시간</span>
            <strong>{formatMinutes(room.todayMinutes)}</strong>
          </div>
          <div>
            <span>함께한 멤버</span>
            <strong>{room.memberCount}명</strong>
          </div>
          <div>
            <span>연속 달성</span>
            <strong>{room.streak}일</strong>
          </div>
        </div>
      </section>

      <nav className="study-room-tabs" aria-label="모임 메뉴">
        <button
          className={activeTab === 'home' ? 'active' : ''}
          type="button"
          aria-current={activeTab === 'home' ? 'page' : undefined}
          onClick={() => setActiveTab('home')}
        >
          <span aria-hidden="true">⌂</span> 홈
        </button>
        <button
          className={activeTab === 'plans' ? 'active' : ''}
          type="button"
          aria-current={activeTab === 'plans' ? 'page' : undefined}
          onClick={() => setActiveTab('plans')}
        >
          <span aria-hidden="true">✓</span> 함께할 계획
          {!!room.sharedItems.length && <small>{room.sharedItems.length}</small>}
        </button>
        {room.joined && me && (
          <button
            className={activeTab === 'chat' ? 'active' : ''}
            type="button"
            aria-current={activeTab === 'chat' ? 'page' : undefined}
            onClick={() => setActiveTab('chat')}
          >
            <span aria-hidden="true">◇</span> 채팅
          </button>
        )}
      </nav>

      {!room.joined ? (
        <section className="study-join-banner" aria-label="모임 참여 안내" hidden={activeTab !== 'home'}>
          <div>
            <span aria-hidden="true">👋</span>
            <div>
              <strong>
                {pendingJoinRequest
                  ? '운영진의 승인을 기다리고 있어요.'
                  : '이 모임과 목표가 잘 맞나요?'}
              </strong>
              <p>
                {pendingJoinRequest
                  ? '승인되면 내 활동 시간을 기록하고 멤버 현황을 볼 수 있어요.'
                  : '가입 요청을 보내면 운영진이 확인한 뒤 참여할 수 있어요.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRequestJoin(room.id)}
            disabled={
              Boolean(pendingJoinRequest) ||
              room.inviteOnly ||
              room.memberCount >= room.maxMembers
            }
          >
            {pendingJoinRequest
              ? '승인 대기 중'
              : room.inviteOnly
                ? '초대 전용'
                : room.memberCount >= room.maxMembers
                  ? '정원 마감'
                  : '가입 요청 보내기'}
          </button>
        </section>
      ) : (
        <section className="focus-console" aria-labelledby="focus-console-title" hidden={activeTab !== 'home'}>
          <div className="focus-console-copy">
            <span className={activeRoomFocus ? 'focus-pulse active' : 'focus-pulse'}>
              <i aria-hidden="true" />
            </span>
            <div>
              <p id="focus-console-title">
                {activeRoomFocus
                  ? `‘${activeRoomFocus.title}’ 활동 중이에요`
                  : '오늘 함께할 계획을 골라 시작해보세요.'}
              </p>
              <strong>
                {activeRoomFocus
                  ? formatFocusTimer(
                      getFocusDurationSeconds(activeRoomFocus, nowMs),
                    )
                  : '일정과 할 일에서 직접 시작할 수 있어요.'}
              </strong>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('plans')}
          >
            {activeRoomFocus ? '계획에서 보기' : '활동 시작'}
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </button>
        </section>
      )}

      <section className="study-shared-plans" aria-labelledby="shared-plans-title" hidden={activeTab !== 'plans'}>
        <div className="study-panel-heading">
          <div>
            <p className="eyebrow">공동 계획</p>
            <h2 id="shared-plans-title">함께할 계획</h2>
            <p>같은 계획을 보되 완료와 참여 상태는 멤버마다 따로 기록해요.</p>
          </div>
          {canCreatePlan && (
            <button
              className="room-primary-button"
              type="button"
              onClick={() => {
                setIsPlanEditorOpen(true)
              }}
            >
              <span aria-hidden="true">＋</span> 계획 만들기
            </button>
          )}
        </div>

        {!!room.sharedItems.length && (
          <div className="study-shared-plan-filters" aria-label="함께할 계획 유형">
            {sharedPlanFilters.map((filter) => (
              <button
                className={planFilter === filter.value ? 'active' : ''}
                type="button"
                key={filter.value}
                aria-pressed={planFilter === filter.value}
                onClick={() => setPlanFilter(filter.value)}
              >
                {filter.value === 'all' ? (
                  <ListChecks size={15} aria-hidden="true" />
                ) : filter.value === 'event' ? (
                  <CalendarBlank size={15} aria-hidden="true" />
                ) : (
                  <CheckSquare size={15} aria-hidden="true" />
                )}
                {filter.label}
              </button>
            ))}
          </div>
        )}

        <div className="study-shared-plan-groups">
          {sharedPlanGroups.map((group) => (
            <section className={`study-shared-plan-group ${group.key}`} key={group.key}>
              <header>
                <h3>{sharedPlanGroupLabels[group.key]}</h3>
                <span>{group.items.length}</span>
              </header>
              <div className="study-shared-plan-list">
                {group.items.map((item) => {
                  const creator = room.members.find(
                    (member) => member.id === item.createdById,
                  )
                  const isMineActive = Boolean(
                    me &&
                      (item.type === 'event'
                        ? item.participantMemberIds.includes(me.id)
                        : item.completedMemberIds.includes(me.id)),
                  )
                  const statusMemberIds =
                    item.type === 'event'
                      ? item.participantMemberIds
                      : item.completedMemberIds
                  const statusMembers = statusMemberIds
                    .map((memberId) =>
                      room.members.find((member) => member.id === memberId),
                    )
                    .filter((member) => member !== undefined)
                  const focusRecord = roomFocusRecords.find(
                    (record) => record.sourceId === item.id,
                  )
                  const isRunning = Boolean(
                    focusRecord && isFocusRecordRunning(focusRecord),
                  )

                  return (
                    <article
                      className={`study-shared-plan-row ${item.type}${isRunning ? ' running' : focusRecord ? ' paused' : ''}`}
                      key={item.id}
                    >
                      <span className="study-shared-plan-icon" aria-hidden="true">
                        {item.type === 'event' ? (
                          <CalendarBlank size={21} weight="bold" />
                        ) : (
                          <CheckSquare size={21} weight="bold" />
                        )}
                      </span>

                      <div className="study-shared-plan-copy">
                        <div className="study-shared-plan-meta">
                          <span className={`shared-plan-kind ${item.type}`}>
                            {sharedItemTypeLabels[item.type]}
                          </span>
                          <time dateTime={item.date}>{formatSharedDate(item)}</time>
                          <span>{getSharedRepeatLabel(item)}</span>
                          {focusRecord && (
                            <strong className={isRunning ? 'running' : 'paused'}>
                              {isRunning ? '진행 중' : '일시정지'}
                              <time>
                                {formatFocusTimer(
                                  getFocusDurationSeconds(focusRecord, nowMs),
                                )}
                              </time>
                            </strong>
                          )}
                        </div>

                        <h3>{item.title}</h3>
                        {item.location && (
                          <p className="shared-plan-location">
                            <MapPin size={14} weight="fill" aria-hidden="true" />
                            {item.location}
                          </p>
                        )}
                        {item.note && <p>{item.note}</p>}

                        <div className="study-shared-plan-footer">
                          <span>{creator?.name ?? '멤버'}님이 작성</span>
                          {statusMembers.length ? (
                            <button
                              className="shared-plan-members-button"
                              type="button"
                              aria-label={
                                item.type === 'event'
                                  ? `${statusMembers.length}명의 참여 예정 멤버 보기`
                                  : `${statusMembers.length}명의 완료 멤버 보기`
                              }
                              onClick={() => setViewingStatusItemId(item.id)}
                            >
                              <span className="shared-plan-member-stack" aria-hidden="true">
                                {statusMembers.slice(0, 5).map((member) => (
                                  <i key={member.id}>{member.avatar}</i>
                                ))}
                                {statusMembers.length > 5 && (
                                  <i>+{statusMembers.length - 5}</i>
                                )}
                              </span>
                              <span>
                                {item.type === 'event'
                                  ? `${statusMembers.length}명 참여 예정`
                                  : `${statusMembers.length}/${room.memberCount}명 완료`}
                              </span>
                            </button>
                          ) : (
                            <span>
                              {item.type === 'event'
                                ? '아직 참여 예정인 멤버 없음'
                                : `0/${room.memberCount}명 완료`}
                            </span>
                          )}
                          {room.joined && me && (
                            <button
                              className={`shared-plan-status-toggle${isMineActive ? ' active' : ''}`}
                              type="button"
                              onClick={() => changeSharedItemStatus(item.id)}
                            >
                              {item.type === 'event'
                                ? isMineActive
                                  ? '참여 중'
                                  : '참여할게요'
                                : isMineActive
                                  ? '완료함'
                                  : '내 완료 체크'}
                            </button>
                          )}
                        </div>
                      </div>

                      {room.joined && me && (
                        <FocusToggleButton
                          label={`${item.title} 활동`}
                          record={focusRecord}
                          onStart={() =>
                            onStartFocus('study', item.id, item.title, {
                              roomId: room.id,
                            })
                          }
                          onPause={onPauseFocus}
                        />
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          ))}

          {!sharedPlanGroups.length && room.sharedItems.length > 0 && (
            <div className="study-shared-plan-empty compact">
              <strong>이 유형의 계획은 아직 없어요.</strong>
            </div>
          )}
          {!room.sharedItems.length && (
            <div className="study-shared-plan-empty">
              <span aria-hidden="true">＋</span>
              <strong>아직 함께할 계획이 없어요. 모임의 첫 계획을 만들어보세요.</strong>
            </div>
          )}
        </div>
      </section>

      <div className="study-detail-grid" hidden={activeTab !== 'home'}>
        <section className="study-members-panel" aria-labelledby="members-title">
          <div className="study-panel-heading">
            <div>
              <p className="eyebrow">멤버 활동</p>
              <h2 id="members-title">이번 주를 함께 이어가고 있어요</h2>
            </div>
            <span>{room.memberCount}/{room.maxMembers}명</span>
          </div>

          <ul className="study-member-list">
            {rankedMembers.map((member) => {
              const weekly = getWeeklyActivitySummary(member)
              const visibility = member.profileVisibility ?? 'roomMembers'
              const canViewMemberActivity =
                member.isMe ||
                visibility === 'public' ||
                (visibility === 'roomMembers' && room.joined)
              return (
                <li key={member.id}>
                  <Link
                    to={`/studies/${room.id}/members/${member.id}`}
                    aria-label={`${member.name}님의 프로필 보기`}
                  >
                    <div className="study-member-card-heading">
                      <span className={`study-member-avatar ${member.status}`}>
                        {member.avatar}
                        <i aria-hidden="true" />
                      </span>
                      <div className="study-member-copy">
                        <div>
                          <strong>
                            {member.name} {member.isMe && <small>나</small>}
                          </strong>
                          {canViewMemberActivity && (
                            <span className={`member-status ${member.status}`}>
                              {statusLabels[member.status]}
                            </span>
                          )}
                        </div>
                        <p>
                          {canViewMemberActivity
                            ? member.focusLabel
                            : '활동 기록을 공개하지 않았어요.'}
                        </p>
                      </div>
                      <span className="study-member-card-arrow" aria-hidden="true">→</span>
                    </div>

                    {canViewMemberActivity ? (
                      <>
                        <div className="member-weekly-activity" aria-label={`${member.name}님의 이번 주 활동`}>
                          {studyWeekdays.map((day, index) => {
                            const minutes = weekly.minutes[index]
                            return (
                              <span key={day} aria-label={`${day}요일 ${formatMinutes(minutes)}`}>
                                <small>{day}</small>
                                <i className={`level-${getActivityLevel(minutes)}`} aria-hidden="true" />
                              </span>
                            )
                          })}
                        </div>

                        <div className="study-member-week-summary">
                          <strong>이번 주 {weekly.activeDays}일</strong>
                          <span>총 {formatMinutes(weekly.totalMinutes)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="member-activity-private-note">
                        <span aria-hidden="true">🔒</span>
                        <strong>주간 활동 비공개</strong>
                      </div>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        <aside className="study-detail-sidebar">
          <section className="study-notice-card" aria-labelledby="notice-title">
            <div className="study-panel-heading compact">
              <div>
                <p className="eyebrow">방장 공지</p>
                <h2 id="notice-title">이번 주 안내</h2>
              </div>
              <span aria-hidden="true">📌</span>
            </div>
            <p>
              일요일 저녁에는 한 주를 가볍게 돌아봐요. 못 채운 날이 있어도
              부담 갖지 말고 다음 날 다시 시작하기!
            </p>
            <time>8월 3일</time>
          </section>
        </aside>
      </div>

      {activeTab === 'chat' && room.joined && me && (
        <StudyRoomChat room={room} me={me} onSend={sendChatMessage} />
      )}

      {isPlanEditorOpen && me && (
        <PlanEditorModal
          initialType="todo"
          selectedDate={new Date('2026-08-14T00:00:00')}
          fixedRoom={room}
          memberId={me.id}
          onClose={() => setIsPlanEditorOpen(false)}
          onSaveShared={saveSharedItem}
        />
      )}

      {viewingStatusItem && (
        <div
          className="study-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewingStatusItemId(undefined)
            }
          }}
        >
          <section
            className="shared-plan-member-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shared-plan-member-dialog-title"
          >
            <header>
              <div>
                <p className="eyebrow">
                  {viewingStatusItem.type === 'event' ? '참여 현황' : '완료 현황'}
                </p>
                <h2 id="shared-plan-member-dialog-title">{viewingStatusItem.title}</h2>
              </div>
              <button
                type="button"
                aria-label="세부 내역 닫기"
                onClick={() => setViewingStatusItemId(undefined)}
              >
                ×
              </button>
            </header>
            <p>
              {viewingStatusItem.type === 'event'
                ? `${viewingStatusItem.participantMemberIds.length}명이 참여할 예정이에요.`
                : `${room.memberCount}명 중 ${viewingStatusItem.completedMemberIds.length}명이 완료했어요.`}
            </p>
            <ul>
              {(viewingStatusItem.type === 'event'
                ? viewingStatusItem.participantMemberIds
                : viewingStatusItem.completedMemberIds
              ).map((memberId) => {
                const member = room.members.find((item) => item.id === memberId)
                if (!member) return null
                return (
                  <li key={member.id}>
                    <Link to={`/studies/${room.id}/members/${member.id}`}>
                      <span className={`study-member-avatar ${member.status}`}>
                        {member.avatar}<i aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{member.name}{member.isMe && <small> 나</small>}</strong>
                        <small>
                          {viewingStatusItem.type === 'event'
                            ? '참여 예정'
                            : formatCompletedAt(
                                viewingStatusItem.completedAtByMember?.[member.id],
                              )}
                        </small>
                      </span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      )}
    </main>
  )
}
