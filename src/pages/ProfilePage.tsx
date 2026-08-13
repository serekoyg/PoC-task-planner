import { Link } from 'react-router-dom'
import type { Todo } from '../data/initialData'
import type { StudyRoom } from '../data/studyRooms'

type ProfilePageProps = {
  todos: Todo[]
  rooms: StudyRoom[]
}

const weeklyFocus = [
  { day: '월', minutes: 64 },
  { day: '화', minutes: 82 },
  { day: '수', minutes: 48 },
  { day: '목', minutes: 96 },
  { day: '금', minutes: 71 },
  { day: '토', minutes: 35 },
  { day: '일', minutes: 0 },
]

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours ? `${hours}시간 ${rest}분` : `${rest}분`
}

export default function ProfilePage({ todos, rooms }: ProfilePageProps) {
  const allTodos = todos
  const completedTodos = allTodos.filter((todo) => todo.done).length
  const joinedRooms = rooms.filter((room) => room.joined)
  const todayFocusMinutes = joinedRooms.reduce((total, room) => {
    const me = room.members.find((member) => member.isMe)
    return total + (me?.minutes ?? 0)
  }, 0)
  const longestStreak = Math.max(...joinedRooms.map((room) => room.streak), 0)
  const maxFocusMinutes = Math.max(...weeklyFocus.map((item) => item.minutes), 1)

  return (
    <main className="profile-page">
      <section className="profile-hero" aria-labelledby="profile-title">
        <div className="profile-identity">
          <span className="profile-avatar" aria-hidden="true">민</span>
          <div>
            <p className="eyebrow">나의 하루</p>
            <h1 id="profile-title">민서님의 기록</h1>
            <p>오늘의 작은 집중이 쌓여 꾸준한 하루를 만들고 있어요.</p>
          </div>
        </div>
        <Link to="/todos">오늘 할 일 계속하기 <span aria-hidden="true">→</span></Link>
      </section>

      <section className="profile-stats" aria-label="나의 활동 요약">
        <article>
          <span className="profile-stat-icon coral" aria-hidden="true">◷</span>
          <div><small>오늘 집중</small><strong>{formatMinutes(todayFocusMinutes)}</strong></div>
          <p>어제보다 18분 더 했어요</p>
        </article>
        <article>
          <span className="profile-stat-icon blue" aria-hidden="true">✓</span>
          <div><small>완료한 할 일</small><strong>{completedTodos}개</strong></div>
          <p>전체 {allTodos.length}개 중 완료</p>
        </article>
        <article>
          <span className="profile-stat-icon green" aria-hidden="true">↗</span>
          <div><small>연속 실천</small><strong>{longestStreak}일</strong></div>
          <p>나의 가장 긴 기록이에요</p>
        </article>
        <article>
          <span className="profile-stat-icon violet" aria-hidden="true">◉</span>
          <div><small>참여 중인 모임</small><strong>{joinedRooms.length}개</strong></div>
          <p>함께하면 더 오래가요</p>
        </article>
      </section>

      <div className="profile-dashboard">
        <section className="profile-weekly-card" aria-labelledby="weekly-focus-title">
          <div className="profile-section-heading">
            <div>
              <p className="eyebrow">이번 주</p>
              <h2 id="weekly-focus-title">집중 리듬</h2>
            </div>
            <strong>6시간 36분</strong>
          </div>
          <div className="weekly-focus-chart" aria-label="요일별 집중 시간">
            {weeklyFocus.map((item, index) => (
              <div key={item.day}>
                <span className="weekly-focus-value">{item.minutes ? `${item.minutes}분` : '—'}</span>
                <span className="weekly-focus-bar-track" aria-hidden="true">
                  <i
                    className={index === 0 ? 'today' : ''}
                    style={{ height: `${Math.max((item.minutes / maxFocusMinutes) * 100, 4)}%` }}
                  />
                </span>
                <small>{item.day}</small>
              </div>
            ))}
          </div>
        </section>

        <aside className="profile-activity-card" aria-labelledby="recent-activity-title">
          <div className="profile-section-heading">
            <div>
              <p className="eyebrow">최근 활동</p>
              <h2 id="recent-activity-title">이어온 기록</h2>
            </div>
          </div>
          <ol className="profile-activity-list">
            <li>
              <span className="coral" aria-hidden="true">◷</span>
              <div><strong>64분 집중했어요</strong><p>자격증 아침반 · 오늘</p></div>
            </li>
            <li>
              <span className="blue" aria-hidden="true">✓</span>
              <div><strong>할 일 하나를 완료했어요</strong><p>이번 주 우선순위 정리하기</p></div>
            </li>
            <li>
              <span className="green" aria-hidden="true">✦</span>
              <div><strong>12일 연속 기록을 만들었어요</strong><p>꾸준한 흐름을 이어가는 중이에요</p></div>
            </li>
          </ol>
        </aside>
      </div>

      <section className="profile-rooms" aria-labelledby="my-rooms-title">
        <div className="profile-section-heading">
          <div>
            <p className="eyebrow">나의 모임</p>
            <h2 id="my-rooms-title">함께 이어가는 목표</h2>
          </div>
          <Link to="/studies">모임 라운지 보기 <span aria-hidden="true">→</span></Link>
        </div>
        <div className="profile-room-list">
          {joinedRooms.map((room) => (
            <Link className={room.accent} to={`/studies/${room.id}`} key={room.id}>
              <span>분류 · {room.category}</span>
              <div><strong>{room.name}</strong><p>{room.goal}</p></div>
              <small>이번 주 {room.weeklyProgress}%</small>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
