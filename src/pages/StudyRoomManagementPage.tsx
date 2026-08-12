import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PlanEditorModal from '../components/PlanEditorModal'
import type {
  StudyRoom,
  StudySharedItem,
  StudySharedItemInput,
} from '../data/studyRooms'
import { getSharedRepeatLabel, sharedItemTypeLabels } from '../lib/studyShared'

type ManagementTab = 'shared' | 'members' | 'notifications' | 'settings'
type SharedFilter = 'all' | StudySharedItem['type']

type StudyRoomManagementPageProps = {
  room?: StudyRoom
  onChangeRoom: (
    roomId: string,
    update: (current: StudyRoom) => StudyRoom,
  ) => void
}

const tabLabels: Record<ManagementTab, string> = {
  shared: '공유 계획',
  members: '멤버·권한',
  notifications: '내 알림',
  settings: '방 설정',
}

const formatPlanDate = (date: string, time?: string) => {
  const target = new Date(`${date}T00:00:00`)
  const label = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(target)
  return time ? `${label} · ${time}` : `${label}까지`
}

type ToggleRowProps = {
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: () => void
}

function ToggleRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: ToggleRowProps) {
  return (
    <label className={disabled ? 'room-toggle-row disabled' : 'room-toggle-row'}>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
    </label>
  )
}

export default function StudyRoomManagementPage({
  room,
  onChangeRoom,
}: StudyRoomManagementPageProps) {
  const [activeTab, setActiveTab] = useState<ManagementTab>('shared')
  const [sharedFilter, setSharedFilter] = useState<SharedFilter>('all')
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [delegateMemberId, setDelegateMemberId] = useState<string>()
  const [notice, setNotice] = useState('')
  const [roomNotifications, setRoomNotifications] = useState(true)
  const [sharedNotifications, setSharedNotifications] = useState(true)
  const [chatNotifications, setChatNotifications] = useState(true)
  const [noticeNotifications, setNoticeNotifications] = useState(true)
  const [activityNotifications, setActivityNotifications] = useState(false)
  const [notificationTiming, setNotificationTiming] = useState<'instant' | 'daily'>(
    'daily',
  )
  const [quietHours, setQuietHours] = useState(true)
  const [roomName, setRoomName] = useState(room?.name ?? '')
  const [roomDescription, setRoomDescription] = useState(room?.description ?? '')
  const [roomGoal, setRoomGoal] = useState(room?.goal ?? '')

  const me = room?.members.find((member) => member.isMe)
  const isOwner = Boolean(room && me && room.ownerId === me.id)
  const isManager = Boolean(
    room && me && room.managerIds.includes(me.id),
  )
  const canShare = Boolean(room && (isOwner || isManager || room.allowMemberSharing))

  const visibleTabs = useMemo<ManagementTab[]>(
    () =>
      isOwner
        ? ['shared', 'members', 'notifications', 'settings']
        : ['shared', 'members', 'notifications'],
    [isOwner],
  )

  useEffect(() => {
    if (!isOwner && activeTab === 'settings') setActiveTab('members')
  }, [activeTab, isOwner])

  useEffect(() => {
    if (!isPlanModalOpen && !delegateMemberId) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsPlanModalOpen(false)
      setDelegateMemberId(undefined)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [delegateMemberId, isPlanModalOpen])

  if (!room) {
    return (
      <main className="study-page study-room-missing">
        <span aria-hidden="true">?</span>
        <h1>관리할 모임을 찾을 수 없어요.</h1>
        <p>방이 삭제되었거나 주소가 변경되었을 수 있어요.</p>
        <Link to="/studies">모임 라운지로 돌아가기</Link>
      </main>
    )
  }

  if (!room.joined || !me) {
    return (
      <main className="study-page study-room-missing">
        <span aria-hidden="true">!</span>
        <h1>참여 중인 멤버만 관리 화면을 볼 수 있어요.</h1>
        <p>모임에 먼저 참여한 뒤 알림과 공유 계획을 설정해 주세요.</p>
        <Link to={`/studies/${room.id}`}>모임으로 돌아가기</Link>
      </main>
    )
  }

  const owner = room.members.find((member) => member.id === room.ownerId)
  const delegateMember = room.members.find(
    (member) => member.id === delegateMemberId,
  )
  const visiblePlans = room.sharedItems.filter(
    (item) => sharedFilter === 'all' || item.type === sharedFilter,
  )
  const roleLabel = isOwner ? '방장' : isManager ? '운영진' : '일반 멤버'

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2400)
  }

  const addSharedPlan = (input: StudySharedItemInput) => {
    const item: StudySharedItem = {
      id: `shared-${crypto.randomUUID()}`,
      ...input,
      createdById: me.id,
      completedMemberIds: [],
      participantMemberIds: [],
    }

    onChangeRoom(room.id, (current) => ({
      ...current,
      sharedItems: [item, ...current.sharedItems],
    }))
    setIsPlanModalOpen(false)
    showNotice('함께할 계획을 멤버들과 공유했어요.')
  }

  const toggleMyCompletion = (itemId: string) => {
    onChangeRoom(room.id, (current) => ({
      ...current,
      sharedItems: current.sharedItems.map((item) => {
        if (item.id !== itemId) return item
        const memberIds = item.type === 'event'
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

  const toggleManager = (memberId: string) => {
    onChangeRoom(room.id, (current) => ({
      ...current,
      managerIds: current.managerIds.includes(memberId)
        ? current.managerIds.filter((id) => id !== memberId)
        : [...current.managerIds, memberId],
    }))
  }

  const delegateOwner = () => {
    if (!delegateMember) return
    onChangeRoom(room.id, (current) => ({
      ...current,
      ownerId: delegateMember.id,
      managerIds: Array.from(
        new Set(
          [...current.managerIds.filter((id) => id !== delegateMember.id), me.id],
        ),
      ),
    }))
    setDelegateMemberId(undefined)
    setActiveTab('members')
    showNotice(`${delegateMember.name}님에게 방장을 위임했어요.`)
  }

  const saveRoomSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onChangeRoom(room.id, (current) => ({
      ...current,
      name: roomName.trim() || current.name,
      description: roomDescription.trim(),
      goal: roomGoal.trim() || current.goal,
    }))
    showNotice('방 설정을 저장했어요.')
  }

  return (
    <main className="study-page room-management-page">
      <div className="room-management-topline">
        <Link className="study-back-link" to={`/studies/${room.id}`}>
          <span aria-hidden="true">←</span> {room.name}
        </Link>
        <span className={`room-role-badge ${isOwner ? 'owner' : ''}`}>
          내 권한 · {roleLabel}
        </span>
      </div>

      <header className="room-management-header">
        <div>
          <p className="eyebrow">모임 관리</p>
          <h1>{room.name}</h1>
          <p>함께할 계획과 멤버 권한, 나에게 오는 알림을 관리해요.</p>
        </div>
        <div className="room-management-summary" aria-label="관리 요약">
          <span><strong>{room.sharedItems.length}</strong> 공유 계획</span>
          <span><strong>{room.memberCount}</strong> 멤버</span>
          <span><strong>{roomNotifications ? '켜짐' : '꺼짐'}</strong> 내 알림</span>
        </div>
      </header>

      {notice && <div className="room-management-toast" role="status">✓ {notice}</div>}

      <div className="room-management-layout">
        <nav className="room-management-nav" aria-label="모임 관리 메뉴">
          {visibleTabs.map((tab) => (
            <button
              className={activeTab === tab ? 'active' : ''}
              type="button"
              key={tab}
              aria-current={activeTab === tab ? 'page' : undefined}
              onClick={() => setActiveTab(tab)}
            >
              <span aria-hidden="true">
                {tab === 'shared' ? '▣' : tab === 'members' ? '◉' : tab === 'notifications' ? '◷' : '⚙'}
              </span>
              {tabLabels[tab]}
              {tab === 'settings' && <small>방장</small>}
            </button>
          ))}
          <p>내 알림 설정은 다른 멤버에게 영향을 주지 않아요.</p>
        </nav>

        <section className="room-management-content">
          {activeTab === 'shared' && (
            <>
              <div className="room-management-section-heading">
                <div>
                  <p className="eyebrow">함께 실행하기</p>
                  <h2>함께할 계획</h2>
                  <p>방장과 구성원이 모임 전체에 필요한 계획을 함께 올려요.</p>
                </div>
                {canShare && (
                  <button
                    className="room-primary-button"
                    type="button"
                    onClick={() => setIsPlanModalOpen(true)}
                  >
                    <span aria-hidden="true">＋</span> 공유 계획 추가
                  </button>
                )}
              </div>

              {!canShare && (
                <div className="room-permission-note">
                  이 모임은 방장과 운영진만 공유 계획을 추가할 수 있어요.
                </div>
              )}

              <div className="shared-plan-filter" aria-label="공유 계획 필터">
                {([
                  ['all', '전체'],
                  ['todo', '함께할 일'],
                  ['event', '공통 일정'],
                ] as const).map(([filter, label]) => (
                  <button
                    className={sharedFilter === filter ? 'active' : ''}
                    type="button"
                    key={filter}
                    onClick={() => setSharedFilter(filter)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="shared-plan-list">
                {visiblePlans.map((item) => {
                  const creator = room.members.find(
                    (member) => member.id === item.createdById,
                  )
                  const isCompleted = item.completedMemberIds.includes(me.id)
                  const isParticipating = item.participantMemberIds.includes(me.id)

                  return (
                    <article className={`shared-plan-card ${item.type}`} key={item.id}>
                      <div className="shared-plan-type" aria-hidden="true">
                        {item.type === 'todo' ? '✓' : '▦'}
                      </div>
                      <div className="shared-plan-copy">
                        <div>
                          <span>{sharedItemTypeLabels[item.type]}</span>
                          <time>{formatPlanDate(item.date, item.time)}</time>
                        </div>
                        <h3>{item.title}</h3>
                        {item.note && <p>{item.note}</p>}
                        <small>
                          {creator?.name ?? '멤버'}님이 공유
                          {item.type !== 'event' && ` · ${item.completedMemberIds.length}/${room.memberCount}명 완료`}
                          {item.type === 'event' && ` · ${item.participantMemberIds.length}명 참여 예정`}
                          {item.repeat !== 'none' && ` · ${getSharedRepeatLabel(item)}`}
                        </small>
                      </div>
                      {item.type !== 'event' ? (
                        <button
                          className={isCompleted ? 'completed' : ''}
                          type="button"
                          onClick={() => toggleMyCompletion(item.id)}
                        >
                          {isCompleted ? '✓ 완료함' : '내 완료 체크'}
                        </button>
                      ) : (
                        <button
                          className={isParticipating ? 'completed' : ''}
                          type="button"
                          onClick={() => toggleMyCompletion(item.id)}
                        >
                          {isParticipating ? '✓ 참여함' : '참여할게요'}
                        </button>
                      )}
                    </article>
                  )
                })}
                {!visiblePlans.length && (
                  <div className="shared-plan-empty">
                    <span aria-hidden="true">＋</span>
                    <strong>아직 공유된 계획이 없어요.</strong>
                    <p>모임에서 함께할 첫 일정이나 할 일을 올려보세요.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'members' && (
            <>
              <div className="room-management-section-heading">
                <div>
                  <p className="eyebrow">사람과 역할</p>
                  <h2>멤버·권한</h2>
                  <p>
                    {isOwner
                      ? '운영진을 지정하거나 다른 멤버에게 방장을 위임할 수 있어요.'
                      : '멤버와 역할을 확인할 수 있어요. 권한 변경은 방장만 가능해요.'}
                  </p>
                </div>
                {isOwner && <button type="button" onClick={() => showNotice('초대 링크를 복사했어요.')}>초대 링크 복사</button>}
              </div>

              <div className="room-owner-card">
                <span className="room-member-avatar">{owner?.avatar ?? '?'}</span>
                <div>
                  <span>현재 방장</span>
                  <strong>{owner?.name ?? '알 수 없음'}</strong>
                  <p>방 설정과 멤버 권한을 최종 관리해요.</p>
                </div>
                {isOwner && <span className="room-owner-me">나</span>}
              </div>

              <div className="room-member-management-list">
                {room.members.map((member) => {
                  const memberIsOwner = member.id === room.ownerId
                  const memberIsManager = room.managerIds.includes(member.id)
                  return (
                    <article key={member.id}>
                      <span className={`study-member-avatar ${member.status}`}>
                        {member.avatar}<i aria-hidden="true" />
                      </span>
                      <div>
                        <strong>{member.name}{member.isMe && <small> 나</small>}</strong>
                        <span>
                          {memberIsOwner ? '방장' : memberIsManager ? '운영진' : '일반 멤버'}
                        </span>
                      </div>
                      {isOwner && !memberIsOwner && (
                        <div className="room-member-actions">
                          <button type="button" onClick={() => toggleManager(member.id)}>
                            {memberIsManager ? '운영진 해제' : '운영진 지정'}
                          </button>
                          <button type="button" onClick={() => setDelegateMemberId(member.id)}>
                            방장 위임
                          </button>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </>
          )}

          {activeTab === 'notifications' && (
            <>
              <div className="room-management-section-heading">
                <div>
                  <p className="eyebrow">나에게만 적용</p>
                  <h2>내 알림</h2>
                  <p>알림이 많다면 이 모임만 끄거나 중요한 소식만 골라 받을 수 있어요.</p>
                </div>
                <span className={roomNotifications ? 'notification-state on' : 'notification-state'}>
                  {roomNotifications ? '알림 켜짐' : '알림 꺼짐'}
                </span>
              </div>

              <section className="room-setting-card important">
                <ToggleRow
                  title="이 모임 알림 받기"
                  description="끄더라도 모임 참여와 공유 계획은 그대로 유지돼요."
                  checked={roomNotifications}
                  onChange={() => setRoomNotifications((current) => !current)}
                />
              </section>

              <section className="room-setting-card">
                <h3>받을 알림</h3>
                <ToggleRow
                  title="함께할 계획"
                  description="새 계획, 마감 임박, 일정 변경을 알려드려요."
                  checked={sharedNotifications}
                  disabled={!roomNotifications}
                  onChange={() => setSharedNotifications((current) => !current)}
                />
                <ToggleRow
                  title="채팅 메시지"
                  description="모임 채팅방에 새 메시지가 올라오면 알려드려요."
                  checked={chatNotifications}
                  disabled={!roomNotifications}
                  onChange={() => setChatNotifications((current) => !current)}
                />
                <ToggleRow
                  title="방장 공지"
                  description="방장이 새 공지를 올리거나 수정했을 때 알려드려요."
                  checked={noticeNotifications}
                  disabled={!roomNotifications}
                  onChange={() => setNoticeNotifications((current) => !current)}
                />
                <ToggleRow
                  title="멤버 활동"
                  description="활동 시작과 완료 인증 같은 소식을 받아요."
                  checked={activityNotifications}
                  disabled={!roomNotifications}
                  onChange={() => setActivityNotifications((current) => !current)}
                />
              </section>

              <section className="room-setting-card">
                <h3>알림 빈도</h3>
                <div className="notification-frequency" role="radiogroup" aria-label="알림 빈도">
                  <button
                    className={notificationTiming === 'instant' ? 'active' : ''}
                    type="button"
                    role="radio"
                    aria-checked={notificationTiming === 'instant'}
                    disabled={!roomNotifications}
                    onClick={() => setNotificationTiming('instant')}
                  >
                    <strong>바로 받기</strong><span>새 소식이 생길 때마다</span>
                  </button>
                  <button
                    className={notificationTiming === 'daily' ? 'active' : ''}
                    type="button"
                    role="radio"
                    aria-checked={notificationTiming === 'daily'}
                    disabled={!roomNotifications}
                    onClick={() => setNotificationTiming('daily')}
                  >
                    <strong>하루 한 번 모아보기</strong><span>오후 8시에 요약해서</span>
                  </button>
                </div>
                <ToggleRow
                  title="방해 금지 시간"
                  description="오후 10시부터 오전 7시까지 알림을 잠시 미뤄요."
                  checked={quietHours}
                  disabled={!roomNotifications}
                  onChange={() => setQuietHours((current) => !current)}
                />
              </section>
            </>
          )}

          {activeTab === 'settings' && isOwner && (
            <>
              <div className="room-management-section-heading">
                <div>
                  <p className="eyebrow">방장 전용</p>
                  <h2>방 설정</h2>
                  <p>모임 정보와 구성원이 공유 계획을 올릴 수 있는 범위를 정해요.</p>
                </div>
              </div>

              <form className="room-settings-form" onSubmit={saveRoomSettings}>
                <section className="room-setting-card">
                  <h3>기본 정보</h3>
                  <label>
                    <span>모임 이름</span>
                    <input value={roomName} onChange={(event) => setRoomName(event.target.value)} />
                  </label>
                  <label>
                    <span>소개</span>
                    <textarea value={roomDescription} onChange={(event) => setRoomDescription(event.target.value)} />
                  </label>
                  <label>
                    <span>공동 목표</span>
                    <input value={roomGoal} onChange={(event) => setRoomGoal(event.target.value)} />
                  </label>
                </section>

                <section className="room-setting-card">
                  <h3>공유 권한</h3>
                  <p>누가 모임 전체에 보이는 일정과 할 일을 추가할 수 있나요?</p>
                  <div className="room-permission-options">
                    <label className={room.allowMemberSharing ? 'active' : ''}>
                      <input
                        type="radio"
                        name="sharing-permission"
                        checked={room.allowMemberSharing}
                        onChange={() => onChangeRoom(room.id, (current) => ({ ...current, allowMemberSharing: true }))}
                      />
                      <span><strong>모든 구성원</strong><small>누구나 공통 계획을 제안하고 공유해요.</small></span>
                    </label>
                    <label className={!room.allowMemberSharing ? 'active' : ''}>
                      <input
                        type="radio"
                        name="sharing-permission"
                        checked={!room.allowMemberSharing}
                        onChange={() => onChangeRoom(room.id, (current) => ({ ...current, allowMemberSharing: false }))}
                      />
                      <span><strong>방장과 운영진</strong><small>관리 권한이 있는 멤버만 계획을 공유해요.</small></span>
                    </label>
                  </div>
                </section>

                <div className="room-settings-actions">
                  <button className="room-primary-button" type="submit">변경 사항 저장</button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>

      {isPlanModalOpen && (
        <PlanEditorModal
          initialType="todo"
          selectedDate={new Date('2026-08-14T00:00:00')}
          fixedRoom={room}
          memberId={me.id}
          onClose={() => setIsPlanModalOpen(false)}
          onSaveShared={addSharedPlan}
        />
      )}

      {delegateMember && (
        <div className="study-modal-backdrop" role="presentation">
          <section className="study-create-modal owner-delegate-modal" role="dialog" aria-modal="true" aria-labelledby="delegate-owner-title">
            <div className="delegate-warning-icon" aria-hidden="true">↗</div>
            <p className="eyebrow">방장 권한 위임</p>
            <h2 id="delegate-owner-title">{delegateMember.name}님에게 방장을 위임할까요?</h2>
            <p>위임하는 즉시 {delegateMember.name}님이 방 설정과 멤버 권한을 관리하게 됩니다.</p>
            <div className="delegate-role-change">
              <span><small>현재</small><strong>민서 · 방장</strong></span>
              <i aria-hidden="true">→</i>
              <span><small>위임 후</small><strong>민서 · 운영진</strong></span>
            </div>
            <div className="delegate-checklist">
              <p>• 내 공유 계획과 집중 기록은 그대로 유지돼요.</p>
              <p>• 방장 전용 설정은 더 이상 수정할 수 없어요.</p>
              <p>• 새 방장이 다시 위임해야 방장 권한을 돌려받을 수 있어요.</p>
            </div>
            <div className="delegate-modal-actions">
              <button type="button" onClick={() => setDelegateMemberId(undefined)}>취소</button>
              <button className="danger" type="button" onClick={delegateOwner}>방장 위임하기</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
