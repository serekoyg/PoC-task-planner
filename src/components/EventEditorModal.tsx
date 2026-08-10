import { FormEvent, useEffect, useState } from 'react'
import type {
  CalendarEvent,
  CalendarEventInput,
} from '../data/initialData'
import { toDateKey } from '../data/initialData'

type EventEditorModalProps = {
  selectedDate: Date
  event?: CalendarEvent
  onClose: () => void
  onSave: (event: CalendarEventInput) => void
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

const createForm = (
  selectedDate: Date,
  event?: CalendarEvent,
): CalendarEventInput => ({
  date: event?.date ?? toDateKey(selectedDate),
  title: event?.title ?? '',
  startTime: event?.startTime ?? event?.time ?? '09:00',
  endTime: event?.endTime ?? '10:00',
  allDay: event?.allDay ?? false,
  color: event?.color ?? 'coral',
  category: event?.category ?? '개인',
  location: event?.location ?? '',
  note: event?.note ?? '',
  repeat: event?.repeat ?? 'none',
  reminder: event?.reminder ?? '30m',
})

export default function EventEditorModal({
  selectedDate,
  event,
  onClose,
  onSave,
  onDelete,
}: EventEditorModalProps) {
  const [form, setForm] = useState(() => createForm(selectedDate, event))
  const [error, setError] = useState('')
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false)
  const isEditing = Boolean(event)

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

    onSave({
      ...form,
      title,
      location: form.location.trim(),
      note: form.note.trim(),
    })
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
              <span>분류</span>
              <select
                value={form.category}
                onChange={(changeEvent) =>
                  setForm({
                    ...form,
                    category: changeEvent.target
                      .value as CalendarEventInput['category'],
                  })
                }
              >
                <option>개인</option>
                <option>업무</option>
                <option>약속</option>
                <option>운동</option>
                <option>기타</option>
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
                <option value="monthly">매월</option>
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
