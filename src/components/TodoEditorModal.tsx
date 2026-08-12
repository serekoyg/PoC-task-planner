import { FormEvent, useEffect, useState } from 'react'
import type { Todo, TodoInput } from '../data/initialData'
import { toDateKey } from '../data/initialData'
import type { PlannerProject } from '../data/projects'
import type { StudyRoom } from '../data/studyRooms'

type TodoEditorModalProps = {
  selectedDate: Date
  projects: PlannerProject[]
  studyRooms: StudyRoom[]
  defaultProjectName?: string
  todo?: Todo
  onClose: () => void
  onSave: (todo: TodoInput, sharedRoomId?: string) => void
  onDelete?: () => void
}

const colorOptions: Array<{ value: TodoInput['color']; label: string }> = [
  { value: 'coral', label: '코랄' },
  { value: 'blue', label: '블루' },
  { value: 'green', label: '그린' },
]

const createForm = (
  selectedDate: Date,
  todo?: Todo,
  defaultProjectName?: string,
): TodoInput => ({
  date: todo?.date ?? toDateKey(selectedDate),
  text: todo?.text ?? '',
  priority: todo?.priority ?? 'medium',
  category: todo?.category ?? '개인',
  dueTime: todo?.dueTime ?? '',
  reminder: todo?.reminder ?? 'none',
  color: todo?.color ?? 'blue',
  note: todo?.note ?? '',
  project: todo?.project ?? defaultProjectName ?? '받은 편지함',
  estimatedMinutes: todo?.estimatedMinutes ?? 30,
  memo: todo?.memo,
})

export default function TodoEditorModal({
  selectedDate,
  projects,
  studyRooms,
  defaultProjectName,
  todo,
  onClose,
  onSave,
  onDelete,
}: TodoEditorModalProps) {
  const [form, setForm] = useState(() =>
    createForm(selectedDate, todo, defaultProjectName),
  )
  const [error, setError] = useState('')
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false)
  const [sharedRoomId, setSharedRoomId] = useState('')
  const isEditing = Boolean(todo)
  const selectedRoom = studyRooms.find((room) => room.id === sharedRoomId)

  useEffect(() => {
    const closeOnEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const saveTodo = (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()
    const text = form.text.trim()

    if (!text) {
      setError('할 일 이름을 입력해 주세요.')
      return
    }

    onSave(
      {
        ...form,
        text,
        note: form.note.trim(),
        project: form.project?.trim() || undefined,
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
        className="event-editor-modal todo-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="todo-editor-title"
      >
        <div className="event-modal-heading">
          <div>
            <p className="eyebrow">{isEditing ? '할 일 관리' : '새로운 할 일'}</p>
            <h2 id="todo-editor-title">
              {isEditing ? '할 일 편집' : '새 할 일 만들기'}
            </h2>
            <p>우선순위와 마감 시간, 알림을 정해 실행 계획을 구체화하세요.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="할 일 창 닫기">
            ×
          </button>
        </div>

        <form className="event-editor-form" onSubmit={saveTodo}>
          <label className="event-title-field">
            <span>할 일 이름</span>
            <input
              autoFocus
              maxLength={50}
              placeholder="예: 발표 자료 초안 완성하기"
              value={form.text}
              onChange={(changeEvent) => {
                setError('')
                setForm({ ...form, text: changeEvent.target.value })
              }}
            />
          </label>

          <div className="event-form-row">
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
            <label>
              <span>마감 시간</span>
              <input
                type="time"
                value={form.dueTime}
                onChange={(changeEvent) =>
                  setForm({ ...form, dueTime: changeEvent.target.value })
                }
              />
            </label>
          </div>

          <div className="event-form-row">
            <label>
              <span>우선순위</span>
              <select
                value={form.priority}
                onChange={(changeEvent) =>
                  setForm({
                    ...form,
                    priority: changeEvent.target.value as TodoInput['priority'],
                  })
                }
              >
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </label>
            <label>
              <span>분류</span>
              <select
                value={form.category}
                onChange={(changeEvent) =>
                  setForm({
                    ...form,
                    category: changeEvent.target.value as TodoInput['category'],
                  })
                }
              >
                <option>개인</option>
                <option>업무</option>
                <option>공부</option>
                <option>운동</option>
                <option>기타</option>
              </select>
            </label>
          </div>

          <div className="event-form-row">
            <label>
              <span>프로젝트</span>
              <select
                value={form.project ?? '받은 편지함'}
                onChange={(changeEvent) =>
                  setForm({ ...form, project: changeEvent.target.value })
                }
              >
                <option value="받은 편지함">받은 편지함</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.name}>{project.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>예상 소요 시간</span>
              <input
                type="number"
                min={5}
                max={480}
                step={5}
                value={form.estimatedMinutes ?? 30}
                onChange={(changeEvent) =>
                  setForm({
                    ...form,
                    estimatedMinutes: Number(changeEvent.target.value) || 30,
                  })
                }
              />
            </label>
          </div>

          <label>
            <span>알림</span>
            <select
              value={form.reminder}
              onChange={(changeEvent) =>
                setForm({
                  ...form,
                  reminder: changeEvent.target.value as TodoInput['reminder'],
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

          <fieldset className="event-color-field">
            <legend>색상</legend>
            <div>
              {colorOptions.map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="todo-color"
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
              placeholder="완료 조건이나 참고 사항을 적어두세요."
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
                  onChange={(event) => setSharedRoomId(event.target.value)}
                  aria-describedby={selectedRoom ? 'todo-share-scope-note' : undefined}
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
                <p className="share-scope-notice" id="todo-share-scope-note">
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
                  할 일 삭제
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
                {isEditing ? '변경 저장' : '할 일 추가'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}
