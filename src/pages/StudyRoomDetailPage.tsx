import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PlanEditorModal from '../components/PlanEditorModal'
import StudyRoomChat from '../components/StudyRoomChat'
import type { FocusRecord, FocusSourceType } from '../data/focusRecords'
import type {
  StudyMemberStatus,
  StudyRoom,
  StudySharedItem,
  StudySharedItemInput,
} from '../data/studyRooms'
import {
  getSharedRepeatLabel,
  sharedItemTypeLabels,
} from '../lib/studyShared'
import { formatFocusTimer, getFocusDurationSeconds } from '../lib/focus'

type StudyRoomDetailPageProps = {
  room?: StudyRoom
  activeFocusRecords: FocusRecord[]
  nowMs: number
  onJoinRoom: (roomId: string) => void
  onChangeRoom: (
    roomId: string,
    update: (current: StudyRoom) => StudyRoom,
  ) => void
  onStartFocus: (
    sourceType: FocusSourceType,
    sourceId: string,
    title: string,
  ) => void
  onStopFocus: (recordId: string) => void
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

type StudyRoomTab = 'home' | 'plans' | 'chat'

export default function StudyRoomDetailPage({
  room,
  activeFocusRecords,
  nowMs,
  onJoinRoom,
  onChangeRoom,
  onStartFocus,
  onStopFocus,
}: StudyRoomDetailPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<StudyRoomTab>('home')
  const [isPlanEditorOpen, setIsPlanEditorOpen] = useState(false)
  const activeRoomFocus = activeFocusRecords.find(
    (record) => record.sourceType === 'study' && record.sourceId === room?.id,
  )
  const rankedMembers = useMemo(
    () => [...(room?.members ?? [])].sort((a, b) => b.minutes - a.minutes),
    [room],
  )

  useEffect(() => {
    const activityId = searchParams.get('startActivity')
    if (!activityId || !room) return

    const activity = room.sharedItems.find((item) => item.id === activityId)
    setActiveTab('home')
    if (!activeRoomFocus) {
      onStartFocus(
        'study',
        room.id,
        activity?.title ?? `${room.name} 활동`,
      )
    }

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('startActivity')
    setSearchParams(nextParams, { replace: true })
  }, [activeRoomFocus, onStartFocus, room, searchParams, setSearchParams])

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

  const liveMembers = room.members.filter(
    (member) => member.status === 'studying',
  ).length
  const achievedDays = Math.round((room.weeklyProgress / 100) * 7)
  const me = room.members.find((member) => member.isMe)
  const hasManagementRole = Boolean(
    me && (room.ownerId === me.id || room.managerIds.includes(me.id)),
  )
  const canCreatePlan = Boolean(
    room.joined && me && (hasManagementRole || room.allowMemberSharing),
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
        return item.type === 'event'
          ? { ...item, participantMemberIds: nextMemberIds }
          : { ...item, completedMemberIds: nextMemberIds }
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
          <div className="study-detail-goal">
            <span aria-hidden="true">◎</span>
            <div>
              <small>우리의 공동 목표</small>
              <strong>{room.goal}</strong>
            </div>
          </div>
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
              <strong>이 모임과 목표가 잘 맞나요?</strong>
              <p>참여하면 내 활동 시간을 기록하고 멤버 현황을 볼 수 있어요.</p>
            </div>
          </div>
          <button type="button" onClick={() => onJoinRoom(room.id)}>
            모임 참여하기
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
                  : '오늘의 활동을 시작해 볼까요?'}
              </p>
              <strong>
                {formatFocusTimer(
                  activeRoomFocus
                    ? getFocusDurationSeconds(activeRoomFocus, nowMs)
                    : 0,
                )}
              </strong>
            </div>
          </div>
          <button
            className={activeRoomFocus ? 'stop' : ''}
            type="button"
            onClick={() => {
              if (activeRoomFocus) {
                onStopFocus(activeRoomFocus.id)
              } else {
                onStartFocus('study', room.id, `${room.name} 활동`)
              }
            }}
          >
            <span aria-hidden="true">{activeRoomFocus ? '■' : '▶'}</span>
            {activeRoomFocus ? '활동 마치기' : '활동 시작'}
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

        <div className="study-shared-plan-list">
          {room.sharedItems.map((item) => {
            const creator = room.members.find(
              (member) => member.id === item.createdById,
            )
            const isMineActive = Boolean(
              me &&
                (item.type === 'event'
                  ? item.participantMemberIds.includes(me.id)
                  : item.completedMemberIds.includes(me.id)),
            )
            return (
              <article className={`study-shared-plan-card ${item.type}`} key={item.id}>
                <div className="study-shared-plan-card-heading">
                  <div>
                    <span className={`shared-plan-kind ${item.type}`}>
                      {sharedItemTypeLabels[item.type]}
                    </span>
                    <time>{formatSharedDate(item)}</time>
                    <span>{getSharedRepeatLabel(item)}</span>
                  </div>
                </div>
                <h3>{item.title}</h3>
                {item.location && <p className="shared-plan-location">⌖ {item.location}</p>}
                {item.note && <p>{item.note}</p>}
                <div className="study-shared-plan-footer">
                  <span>{creator?.name ?? '멤버'}님이 작성</span>
                  <span>
                    {item.type === 'event'
                      ? `${item.participantMemberIds.length}명 참여 예정`
                      : `${item.completedMemberIds.length}/${room.memberCount}명 완료`}
                  </span>
                  {room.joined && me && (
                    <button
                      className={isMineActive ? 'active' : ''}
                      type="button"
                      onClick={() => changeSharedItemStatus(item.id)}
                    >
                      {item.type === 'event'
                        ? isMineActive ? '✓ 참여함' : '참여할게요'
                        : isMineActive ? '✓ 완료함' : '내 완료 체크'}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
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
              <p className="eyebrow">오늘 함께한 멤버</p>
              <h2 id="members-title">오늘도 함께하고 있어요</h2>
            </div>
            <span>{room.memberCount}/{room.maxMembers}명</span>
          </div>

          <ol className="study-member-list">
            {rankedMembers.map((member, index) => (
              <li key={member.id}>
                <span className="member-rank">{index + 1}</span>
                <span className={`study-member-avatar ${member.status}`}>
                  {member.avatar}
                  <i aria-hidden="true" />
                </span>
                <div className="study-member-copy">
                  <div>
                    <strong>
                      {member.name} {member.isMe && <small>나</small>}
                    </strong>
                    <span className={`member-status ${member.status}`}>
                      {statusLabels[member.status]}
                    </span>
                  </div>
                  <p>{member.focusLabel}</p>
                </div>
                <time>{formatMinutes(member.minutes)}</time>
              </li>
            ))}
          </ol>
        </section>

        <aside className="study-detail-sidebar">
          <section className="weekly-goal-card" aria-labelledby="weekly-goal-title">
            <div className="study-panel-heading compact">
              <div>
                <p className="eyebrow">이번 주</p>
                <h2 id="weekly-goal-title">공동 목표</h2>
              </div>
              <strong>{room.weeklyProgress}%</strong>
            </div>
            <div className="weekly-progress-visual" aria-hidden="true">
              <span style={{ width: `${room.weeklyProgress}%` }} />
            </div>
            <div className="weekly-days" aria-label="주간 체크인 현황">
              {['월', '화', '수', '목', '금', '토', '일'].map((day, index) => (
                <span className={index < achievedDays ? 'done' : ''} key={day}>
                  {index < achievedDays ? '✓' : day}
                </span>
              ))}
            </div>
            <p>
              {achievedDays > 0
                ? `이번 주 ${achievedDays}일 함께 목표를 달성했어요.`
                : '이번 주 첫 번째 목표 달성을 기다리고 있어요.'}
            </p>
          </section>

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
    </main>
  )
}
