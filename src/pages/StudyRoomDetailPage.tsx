import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { StudyMemberStatus, StudyRoom } from '../data/studyRooms'

type StudyRoomDetailPageProps = {
  room?: StudyRoom
  onJoinRoom: (roomId: string) => void
}

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours ? `${hours}시간 ${rest}분` : `${rest}분`
}

const formatTimer = (seconds: number) => {
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const rest = String(seconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${rest}`
}

const statusLabels: Record<StudyMemberStatus, string> = {
  studying: '집중 중',
  resting: '쉬는 중',
  offline: '오늘 참여',
}

export default function StudyRoomDetailPage({
  room,
  onJoinRoom,
}: StudyRoomDetailPageProps) {
  const [isFocusing, setIsFocusing] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const rankedMembers = useMemo(
    () => [...(room?.members ?? [])].sort((a, b) => b.minutes - a.minutes),
    [room],
  )

  useEffect(() => {
    if (!isFocusing) return

    const timer = window.setInterval(
      () => setElapsedSeconds((seconds) => seconds + 1),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [isFocusing])

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

  return (
    <main className="study-page study-detail-page">
      <Link className="study-back-link" to="/studies">
        <span aria-hidden="true">←</span> 모임 라운지
      </Link>

      <section className={`study-detail-hero ${room.accent}`}>
        <div>
          <div className="study-detail-badges">
            <span>{room.category}</span>
            <span className="study-detail-live">
              <i aria-hidden="true" /> {liveMembers}명 집중 중
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
            <span>오늘 총 집중</span>
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

      {!room.joined ? (
        <section className="study-join-banner" aria-label="모임 참여 안내">
          <div>
            <span aria-hidden="true">👋</span>
            <div>
              <strong>이 모임과 목표가 잘 맞나요?</strong>
              <p>참여하면 내 집중 시간을 기록하고 멤버 현황을 볼 수 있어요.</p>
            </div>
          </div>
          <button type="button" onClick={() => onJoinRoom(room.id)}>
            모임 참여하기
          </button>
        </section>
      ) : (
        <section className="focus-console" aria-labelledby="focus-console-title">
          <div className="focus-console-copy">
            <span className={isFocusing ? 'focus-pulse active' : 'focus-pulse'}>
              <i aria-hidden="true" />
            </span>
            <div>
              <p id="focus-console-title">
                {isFocusing ? '지금 함께 집중하고 있어요' : '오늘의 집중을 시작해 볼까요?'}
              </p>
              <strong>{formatTimer(elapsedSeconds)}</strong>
            </div>
          </div>
          <button
            className={isFocusing ? 'stop' : ''}
            type="button"
            onClick={() => setIsFocusing((current) => !current)}
          >
            <span aria-hidden="true">{isFocusing ? '■' : '▶'}</span>
            {isFocusing ? '집중 마치기' : '집중 시작'}
          </button>
        </section>
      )}

      <div className="study-detail-grid">
        <section className="study-members-panel" aria-labelledby="members-title">
          <div className="study-panel-heading">
            <div>
              <p className="eyebrow">오늘의 멤버</p>
              <h2 id="members-title">함께 집중 중이에요</h2>
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
    </main>
  )
}
