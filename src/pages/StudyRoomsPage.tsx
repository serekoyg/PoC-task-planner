import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Plus } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import type { StudyRoom, StudyRoomCreateInput } from '../data/studyRooms'
import {
  Button,
  ButtonLink,
  SegmentedControl,
  Surface,
} from '../design-system'

type StudyRoomsPageProps = {
  rooms: StudyRoom[]
  onRequestJoin: (roomId: string) => void
  onCreateRoom: (input: StudyRoomCreateInput) => string
}

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours ? `${hours}시간 ${rest ? `${rest}분` : ''}`.trim() : `${rest}분`
}

const initialForm: StudyRoomCreateInput = {
  name: '',
  description: '',
  category: '자격증',
  goal: '',
  maxMembers: 8,
  inviteOnly: false,
}

export default function StudyRoomsPage({
  rooms,
  onRequestJoin,
  onCreateRoom,
}: StudyRoomsPageProps) {
  const navigate = useNavigate()
  const [view, setView] = useState<'all' | 'mine'>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const joinedRooms = rooms.filter((room) => room.joined)
  const discoverableRooms = rooms.filter(
    (room) => room.joined || room.visibility !== 'private',
  )
  const visibleRooms = view === 'mine' ? joinedRooms : discoverableRooms
  const studyingCount = useMemo(
    () =>
      rooms.reduce(
        (count, room) =>
          count + room.members.filter((member) => member.status === 'studying').length,
        0,
      ),
    [rooms],
  )
  const myTodayMinutes = joinedRooms.reduce((total, room) => {
    const me = room.members.find((member) => member.isMe)
    return total + (me?.minutes ?? 0)
  }, 0)

  useEffect(() => {
    if (!isCreateOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsCreateOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isCreateOpen])

  const requestJoin = (roomId: string) => {
    onRequestJoin(roomId)
    navigate(`/studies/${roomId}`)
  }

  const createRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim() || !form.goal.trim()) return

    const roomId = onCreateRoom({
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      goal: form.goal.trim(),
    })
    setForm(initialForm)
    setIsCreateOpen(false)
    navigate(`/studies/${roomId}`)
  }

  return (
    <main className="study-page">
      <section className="study-hero" aria-labelledby="study-page-title">
        <div className="study-hero-copy">
          <p className="eyebrow">함께 만드는 꾸준함</p>
          <h1 id="study-page-title">
            혼자보다 꾸준하게,
            <br />함께 이어가요.
          </h1>
          <p>
            공부, 운동, 게임, 취미처럼 함께 이어갈 목표를 정하고 오늘의
            활동과 실천을 가볍게 나눠보세요.
          </p>
          <div className="study-hero-actions">
            <Button
              variant="primary"
              startIcon={<Plus size={16} weight="bold" />}
              onClick={() => setIsCreateOpen(true)}
            >
              모임 만들기
            </Button>
            <Button
              className="study-secondary-button"
              onClick={() => setView('all')}
            >
              공개 모임 둘러보기
            </Button>
          </div>
        </div>

        <Surface
          as="div"
          className="study-hero-board"
          tone="elevated"
          aria-label="나의 모임 요약"
        >
          <div className="live-study-label">
            <span aria-hidden="true" /> 지금 {studyingCount}명이 활동 중
          </div>
          <div className="study-today-time">
            <p>오늘 나의 활동</p>
            <strong>{formatMinutes(myTodayMinutes)}</strong>
            <span>어제보다 18분 더 함께했어요</span>
          </div>
          <div className="study-mini-grid">
            <div>
              <span>참여 중</span>
              <strong>{joinedRooms.length}개</strong>
            </div>
            <div>
              <span>연속 실천</span>
              <strong>{Math.max(...joinedRooms.map((room) => room.streak), 0)}일</strong>
            </div>
          </div>
          <div className="study-people-stack" aria-label="함께 활동 중인 멤버">
            {rooms
              .flatMap((room) => room.members)
              .filter((member) => member.status === 'studying')
              .slice(0, 4)
              .map((member) => (
                <span key={`${member.id}-${member.name}`}>{member.avatar}</span>
              ))}
            <small>함께 실천하면 더 오래가요</small>
          </div>
        </Surface>
      </section>

      <section className="study-room-section" aria-labelledby="room-list-title">
        <div className="study-section-heading">
          <div>
            <p className="eyebrow">모임 라운지</p>
            <h2 id="room-list-title">
              {view === 'mine' ? '내가 참여한 모임' : '함께할 모임을 찾아보세요'}
            </h2>
          </div>
          <SegmentedControl
            ariaLabel="모임 보기"
            className="study-view-tabs"
            items={[
              { value: 'all', label: '전체' },
              { value: 'mine', label: `내 모임 ${joinedRooms.length}` },
            ]}
            value={view}
            onChange={setView}
          />
        </div>

        <div className="study-room-grid">
          {visibleRooms.map((room) => {
            const liveMembers = room.members.filter(
              (member) => member.status === 'studying',
            ).length
            const hasPendingRequest = room.joinRequests.some(
              (request) => request.applicantId === 'me',
            )

            return (
              <Surface
                as="article"
                className={`study-room-card ${room.accent}`}
                key={room.id}
              >
                <div className="room-card-topline">
                  <div>
                    <span className="room-category">분류 · {room.category}</span>
                    {room.visibility === 'private' && <span className="room-private-badge">비공개</span>}
                  </div>
                  {liveMembers > 0 && (
                    <span className="room-live-count">
                      <i aria-hidden="true" /> {liveMembers}명 활동 중
                    </span>
                  )}
                </div>
                <div>
                  <h3>{room.name}</h3>
                  <p>{room.description}</p>
                </div>
                <div className="room-goal">
                  <span aria-hidden="true">◎</span>
                  <p>{room.goal}</p>
                </div>
                <div className="room-card-progress">
                  <div>
                    <span>이번 주 달성률</span>
                    <strong>{room.weeklyProgress}%</strong>
                  </div>
                  <div className="room-progress-track" aria-hidden="true">
                    <span style={{ width: `${room.weeklyProgress}%` }} />
                  </div>
                </div>
                <div className="room-card-footer">
                  <div>
                    <div className="room-member-avatars" aria-hidden="true">
                      {room.members.slice(0, 3).map((member) => (
                        <span key={member.id}>{member.avatar}</span>
                      ))}
                    </div>
                    <small>
                      {room.memberCount}/{room.maxMembers}명
                    </small>
                  </div>
                  {room.joined ? (
                    <ButtonLink
                      className="room-enter-link"
                      size="small"
                      endIcon={<ArrowRight size={14} weight="bold" />}
                      to={`/studies/${room.id}`}
                    >
                      입장하기
                    </ButtonLink>
                  ) : (
                    <Button
                      className="room-join-button"
                      size="small"
                      variant="primary"
                      onClick={() => requestJoin(room.id)}
                      disabled={
                        room.memberCount >= room.maxMembers ||
                        room.inviteOnly ||
                        hasPendingRequest
                      }
                    >
                      {hasPendingRequest
                        ? '승인 대기 중'
                        : room.inviteOnly
                          ? '초대 전용'
                          : room.memberCount >= room.maxMembers
                            ? '정원 마감'
                            : '가입 요청'}
                    </Button>
                  )}
                </div>
              </Surface>
            )
          })}

          <button
            className="create-room-card"
            type="button"
            onClick={() => setIsCreateOpen(true)}
          >
            <span aria-hidden="true">＋</span>
            <strong>새 모임 만들기</strong>
            <small>내 목표에 딱 맞는 방이 없다면 직접 시작해 보세요.</small>
          </button>
        </div>
      </section>

      {isCreateOpen && (
        <div className="study-modal-backdrop" role="presentation">
          <section
            className="study-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-study-title"
          >
            <div className="study-modal-heading">
              <div>
                <p className="eyebrow">새로운 시작</p>
                <h2 id="create-study-title">모임 만들기</h2>
                <p>목표와 분위기를 정하면 바로 방이 만들어져요.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                aria-label="모임 만들기 닫기"
              >
                ×
              </button>
            </div>

            <form className="study-create-form" onSubmit={createRoom}>
              <label>
                <span>모임 이름</span>
                <input
                  autoFocus
                  required
                  maxLength={30}
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="예: 매일 아침 알고리즘"
                />
              </label>
              <label>
                <span>한 줄 소개</span>
                <textarea
                  maxLength={90}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="어떤 사람들이 모여 무엇을 함께하는 모임인가요?"
                />
              </label>
              <div className="study-form-row">
                <label>
                  <span>분류</span>
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm({ ...form, category: event.target.value })
                    }
                  >
                    <option>공부</option>
                    <option>자격증</option>
                    <option>취업</option>
                    <option>어학</option>
                    <option>운동</option>
                    <option>게임</option>
                    <option>취미</option>
                    <option>생활 루틴</option>
                    <option>프로젝트</option>
                    <option>기타</option>
                  </select>
                </label>
                <label>
                  <span>최대 인원</span>
                  <select
                    value={form.maxMembers}
                    onChange={(event) =>
                      setForm({ ...form, maxMembers: Number(event.target.value) })
                    }
                  >
                    <option value={4}>4명</option>
                    <option value={8}>8명</option>
                    <option value={12}>12명</option>
                    <option value={20}>20명</option>
                    <option value={40}>40명</option>
                  </select>
                </label>
              </div>
              <label>
                <span>공동 목표</span>
                <input
                  required
                  maxLength={60}
                  value={form.goal}
                  onChange={(event) => setForm({ ...form, goal: event.target.value })}
                  placeholder="예: 평일 저녁 8시, 하루 30분 함께 실천"
                />
              </label>
              <label className="study-private-toggle">
                <input
                  type="checkbox"
                  checked={form.inviteOnly}
                  onChange={(event) =>
                    setForm({ ...form, inviteOnly: event.target.checked })
                  }
                />
                <span aria-hidden="true" />
                <div>
                  <strong>초대받은 사람만 참여</strong>
                  <small>끄면 누구나 둘러보고 참여할 수 있어요.</small>
                </div>
              </label>
              <div className="study-form-actions">
                <Button onClick={() => setIsCreateOpen(false)}>
                  취소
                </Button>
                <Button
                  className="study-submit-button"
                  variant="primary"
                  type="submit"
                >
                  모임 만들기
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
