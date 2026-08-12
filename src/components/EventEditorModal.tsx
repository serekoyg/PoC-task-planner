import { FormEvent, useEffect, useState } from 'react'
import type {
  CalendarEvent,
  CalendarEventInput,
} from '../data/initialData'
import { toDateKey } from '../data/initialData'
import type { PlannerProject } from '../data/projects'
import type { StudyRoom } from '../data/studyRooms'

type EventEditorModalProps = {
  selectedDate: Date
  projects: PlannerProject[]
  studyRooms: StudyRoom[]
  defaultProjectName?: string
  event?: CalendarEvent
  onClose: () => void
  onSave: (event: CalendarEventInput, sharedRoomId?: string) => void
  onDelete?: () => void
}

const colorOptions: Array<{
  value: CalendarEventInput['color']
  label: string
}> = [
  { value: 'coral', label: '코랄' },
  { value: 'blue', label: '블루' },
  { value: 'green', label: '그린' },
]

const monthWeekOptions = [
  ['first', '첫째'],
  ['second', '둘째'],
  ['third', '셋째'],
  ['fourth', '넷째'],
  ['last', '마지막'],
] as const
const eventWeekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

const createForm = (
  selectedDate: Date,
  event?: CalendarEvent,
  defaultProjectName?: string,
): CalendarEventInput => ({
  date: event?.date ?? toDateKey(selectedDate),
  title: event?.title ?? '',
  startTime: event?.startTime ?? event?.time ?? '09:00',
  endTime: event?.endTime ?? '10:00',
  allDay: event?.allDay ?? false,
  color: event?.color ?? 'coral',
  project: event?.project ?? defaultProjectName ?? '받은 편지함',
  category: event?.category ?? '개인',
  location: event?.location ?? '',
  note: event?.note ?? '',
  repeat: event?.repeat ?? 'none',
  repeatMonthlyWeek: event?.repeatMonthlyWeek ?? 'first',
  repeatMonthlyWeekday:
    event?.repeatMonthlyWeekday ??
    new Date(`${event?.date ?? toDateKey(selectedDate)}T00:00:00`).getDay(),
  reminder: event?.reminder ?? '30m',
})

export default function EventEditorModal({
  selectedDate,
  projects,
  studyRooms,
  defaultProjectName,
  event,
  onClose,
  onSave,
  onDelete,
}: EventEditorModalProps) {
  const [form, setForm] = useState(() =>
    createForm(selectedDate, event, defaultProjectName),
  )
  const [error, setError] = useState('')
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false)
  const [sharedRoomId, setSharedRoomId] = useState('')
  const isEditing = Boolean(event)
  const selectedRoom = studyRooms.find((room) => room.id === sharedRoomId)

  useEffect(() => {
    const closeOnEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const saveEvent = (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()
    const title = form.title.trim()

    if (!title) {
      setError('일정 이름을 입력해 주세요.')
      return
    }

    if (!form.allDay && form.endTime <= form.startTime) {
      setError('종료 시간은 시작 시간보다 늦어야 해요.')
      return
    }

    onSave(
      {
        ...form,
        title,
        location: form.location.trim(),
        note: form.note.trim(),
      },
      sharedRoomId || undefined,
    )
  }

  return (
    <div
      className="event-modal-backdrop"
      role="presentation"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget) onClose()
      }}
    >
      <section
        className="event-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-editor-title"
      >
        <div className="event-modal-heading">
          <div>
            <p className="eyebrow">{isEditing ? '일정 관리' : '새로운 일정'}</p>
            <h2 id="event-editor-title">
              {isEditing ? '일정 편집' : '새 일정 만들기'}
            </h2>
            <p>시간과 장소, 알림까지 한 번에 정리해 두세요.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="일정 창 닫기">
            ×
          </button>
        </div>

        <form className="event-editor-form" onSubmit={saveEvent}>
          <label className="event-title-field">
            <span>일정 이름</span>
            <input
              autoFocus
              maxLength={40}
              placeholder="예: 팀 주간 회의"
              value={form.title}
              onChange={(changeEvent) => {
                setError('')
                setForm({ ...form, title: changeEvent.target.value })
              }}
            />
          </label>

          <div className="event-form-row date-row">
            <label>
              <span>날짜</span>
              <input
                type="date"
                value={form.date}
                onChange={(changeEvent) =>
                  setForm({ ...form, date: changeEvent.target.value })
                }
              />
            </label>
            <label className="all-day-toggle">
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={(changeEvent) =>
                  setForm({ ...form, allDay: changeEvent.target.checked })
                }
              />
              <span aria-hidden="true" />
              <div>
                <strong>하루 종일</strong>
                <small>시간을 정하지 않는 일정</small>
              </div>
            </label>
          </div>

          {!form.allDay && (
            <div className="event-form-row">
              <label>
                <span>시작 시간</span>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(changeEvent) => {
                    setError('')
                    setForm({ ...form, startTime: changeEvent.target.value })
                  }}
                />
              </label>
              <label>
                <span>종료 시간</span>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(changeEvent) => {
                    setError('')
                    setForm({ ...form, endTime: changeEvent.target.value })
                  }}
                />
              </label>
            </div>
          )}

          <div className="event-form-row">
            <label>
              <span>프로젝트</span>
              <select
                value={form.project ?? '받은 편지함'}
                onChange={(changeEvent) =>
                  setForm({
                    ...form,
                    project: changeEvent.target.value,
                  })
                }
              >
                <option value="받은 편지함">받은 편지함</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.name}>{project.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>장소 또는 링크</span>
              <input
                maxLength={50}
                placeholder="예: 3층 회의실, Zoom"
                value={form.location}
                onChange={(changeEvent) =>
                  setForm({ ...form, location: changeEvent.target.value })
                }
              />
            </label>
          </div>

          <div className="event-form-row">
            <label>
              <span>반복</span>
              <select
                value={form.repeat}
                onChange={(changeEvent) =>
                  setForm({
                    ...form,
                    repeat: changeEvent.target
                      .value as CalendarEventInput['repeat'],
                  })
                }
              >
                <option value="none">반복 안 함</option>
                <option value="daily">매일</option>
                <option value="weekdays">평일마다</option>
                <option value="weekly">매주</option>
                <option value="monthly">
                  매월 {new Date(`${form.date}T00:00:00`).getDate()}일
                </option>
                <option value="monthlyWeekday">매월 특정 요일</option>
              </select>
            </label>
            <label>
              <span>알림</span>
              <select
                value={form.reminder}
                onChange={(changeEvent) =>
                  setForm({
                    ...form,
                    reminder: changeEvent.target
                      .value as CalendarEventInput['reminder'],
                  })
                }
              >
                <option value="none">알림 없음</option>
                <option value="10m">10분 전</option>
                <option value="30m">30분 전</option>
                <option value="1h">1시간 전</option>
                <option value="1d">1일 전</option>
              </select>
            </label>
          </div>

          {form.repeat === 'monthlyWeekday' && (
            <fieldset className="event-monthly-weekday-setting">
              <legend>매월 반복 요일</legend>
              <div className="event-form-row">
                <label>
                  <span>몇 번째 주</span>
                  <select
                    value={form.repeatMonthlyWeek}
                    onChange={(changeEvent) =>
                      setForm({
                        ...form,
                        repeatMonthlyWeek: changeEvent.target
                          .value as CalendarEventInput['repeatMonthlyWeek'],
                      })
                    }
                  >
                    {monthWeekOptions.map(([value, label]) => (
                      <option value={value} key={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>요일</span>
                  <select
                    value={form.repeatMonthlyWeekday}
                    onChange={(changeEvent) =>
                      setForm({
                        ...form,
                        repeatMonthlyWeekday: Number(changeEvent.target.value),
                      })
                    }
                  >
                    {eventWeekdayLabels.map((label, index) => (
                      <option value={index} key={label}>{label}요일</option>
                    ))}
                  </select>
                </label>
              </div>
              <p>
                매월 {monthWeekOptions.find(([value]) => value === form.repeatMonthlyWeek)?.[1] ?? '첫째'}{' '}
                {eventWeekdayLabels[form.repeatMonthlyWeekday ?? 0]}요일에 반복돼요.
              </p>
            </fieldset>
          )}

          <fieldset className="event-color-field">
            <legend>색상</legend>
            <div>
              {colorOptions.map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="event-color"
                    value={option.value}
                    checked={form.color === option.value}
                    onChange={() => setForm({ ...form, color: option.value })}
                  />
                  <span className={option.value} aria-hidden="true" />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label>
            <span>메모</span>
            <textarea
              maxLength={160}
              placeholder="준비할 내용이나 참고 사항을 적어두세요."
              value={form.note}
              onChange={(changeEvent) =>
                setForm({ ...form, note: changeEvent.target.value })
              }
            />
          </label>

          {!isEditing && (
            <>
              <label className="share-scope-field">
                <span>공유 범위</span>
                <select
                  value={sharedRoomId}
                  onChange={(changeEvent) =>
                    setSharedRoomId(changeEvent.target.value)
                  }
                  aria-describedby={selectedRoom ? 'event-share-scope-note' : undefined}
                >
                  <option value="">나만 보기</option>
                  {studyRooms.map((room) => {
                    const me = room.members.find((member) => member.isMe)
                    const canShare = Boolean(
                      me &&
                        (room.ownerId === me.id ||
                          room.managerIds.includes(me.id) ||
                          room.allowMemberSharing),
                    )
                    return (
                      <option value={room.id} disabled={!canShare} key={room.id}>
                        {room.name}{canShare ? '' : ' · 공유 권한 없음'}
                      </option>
                    )
                  })}
                </select>
              </label>
              {selectedRoom && (
                <p className="share-scope-notice" id="event-share-scope-note">
                  <span aria-hidden="true">◉</span>
                  이 항목은 모임의 공동 계획으로 등록되며 모든 멤버에게 표시됩니다.
                </p>
              )}
            </>
          )}

          {error && <p className="event-form-error" role="alert">{error}</p>}

          <div className="event-form-actions">
            <div>
              {isEditing && onDelete && !isDeleteConfirming && (
                <button
                  className="event-delete-button"
                  type="button"
                  onClick={() => setIsDeleteConfirming(true)}
                >
                  일정 삭제
                </button>
              )}
              {isDeleteConfirming && (
                <div className="event-delete-confirm">
                  <span>정말 삭제할까요?</span>
                  <button type="button" onClick={() => setIsDeleteConfirming(false)}>
                    취소
                  </button>
                  <button type="button" onClick={onDelete}>
                    삭제
                  </button>
                </div>
              )}
            </div>
            <div>
              <button type="button" onClick={onClose}>취소</button>
              <button className="event-save-button" type="submit">
                {isEditing ? '변경 저장' : '일정 추가'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}
