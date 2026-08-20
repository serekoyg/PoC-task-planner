import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import type {
  StudyMember,
  StudyMemberStatus,
  StudyProfileVisibility,
  StudyRoom,
} from '../data/studyRooms'
import {
  getActivityLevel,
  getWeeklyActivitySummary,
  studyWeekdays,
} from '../lib/studyActivity'

type StudyMemberProfilePageProps = {
  room?: StudyRoom
  member?: StudyMember
}

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours ? `${hours}시간 ${rest}분` : `${rest}분`
}

const statusLabels: Record<StudyMemberStatus, string> = {
  studying: '활동 중',
  resting: '쉬는 중',
  offline: '오프라인',
}

const visibilityLabels: Record<StudyProfileVisibility, string> = {
  public: '전체 공개',
  roomMembers: '같은 모임 멤버에게 공개',
  private: '비공개',
}

export default function StudyMemberProfilePage({
  room,
  member,
}: StudyMemberProfilePageProps) {
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [member?.id])

  if (!room || !member) {
    return (
      <main className="study-page study-room-missing">
        <span aria-hidden="true">?</span>
        <h1>멤버 프로필을 찾을 수 없어요.</h1>
        <p>모임을 나갔거나 프로필 주소가 변경되었을 수 있어요.</p>
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
            <h1>비공개 모임의 프로필이에요.</h1>
            <p>참여 중인 멤버만 멤버 정보를 확인할 수 있어요.</p>
          </div>
        </section>
      </main>
    )
  }

  const visibility = member.profileVisibility ?? 'roomMembers'
  const canViewActivity =
    member.isMe ||
    visibility === 'public' ||
    (visibility === 'roomMembers' && room.joined)
  const weekly = getWeeklyActivitySummary(member)
  const role =
    room.ownerId === member.id
      ? '방장'
      : room.managerIds.includes(member.id)
        ? '운영진'
        : '멤버'

  return (
    <main className="study-page member-profile-page">
      <div className="study-detail-topline">
        <Link className="study-back-link" to={`/studies/${room.id}`}>
          <span aria-hidden="true">←</span> {room.name}
        </Link>
        {member.isMe && (
          <Link className="study-manage-link" to="/settings?section=account">
            프로필 설정
          </Link>
        )}
      </div>

      <section className={`member-profile-hero ${room.accent}`}>
        <span className={`study-member-avatar ${member.status}`} aria-hidden="true">
          {member.avatar}
          <i />
        </span>
        <div>
          <p className="eyebrow">{room.name} · {role}</p>
          <h1>{member.name}{member.isMe ? ' (나)' : ''}</h1>
          <p>{member.bio}</p>
          <div className="member-profile-badges">
            <span>{statusLabels[member.status]}</span>
            {member.isMe && <span>{visibilityLabels[visibility]}</span>}
          </div>
        </div>
      </section>

      {canViewActivity ? (
        <>
          <section className="member-profile-stats" aria-label="멤버 활동 요약">
            <article><small>오늘 활동</small><strong>{formatMinutes(member.minutes)}</strong></article>
            <article><small>이번 주 활동</small><strong>{formatMinutes(weekly.totalMinutes)}</strong></article>
            <article><small>참여한 날</small><strong>{weekly.activeDays}일</strong></article>
          </section>

          <section className="member-profile-week" aria-labelledby="member-week-title">
            <div className="study-panel-heading">
              <div>
                <p className="eyebrow">이번 주</p>
                <h2 id="member-week-title">활동 기록</h2>
              </div>
              <span>진할수록 오래 활동했어요</span>
            </div>
            <div className="member-profile-week-grid">
              {studyWeekdays.map((day, index) => {
                const minutes = weekly.minutes[index]
                return (
                  <div key={day}>
                    <small>{day}</small>
                    <i className={`level-${getActivityLevel(minutes)}`} aria-hidden="true" />
                    <strong>{minutes ? formatMinutes(minutes) : '기록 없음'}</strong>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="member-profile-current">
            <div>
              <p className="eyebrow">최근 활동</p>
              <h2>{member.focusLabel}</h2>
              <p>{statusLabels[member.status]} · 오늘 {formatMinutes(member.minutes)}</p>
            </div>
          </section>
        </>
      ) : (
        <section className="member-profile-private" aria-labelledby="private-profile-title">
          <span aria-hidden="true">🔒</span>
          <div>
            <h2 id="private-profile-title">활동 기록을 공개하지 않는 프로필이에요.</h2>
            <p>이름과 모임 역할만 확인할 수 있어요.</p>
          </div>
        </section>
      )}
    </main>
  )
}
