import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { toDateKey } from '../data/initialData'
import { getCalendarDays } from '../lib/date'

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']
const monthLabels = Array.from({ length: 12 }, (_, index) => `${index + 1}월`)
const yearOptions = Array.from({ length: 201 }, (_, index) => 1900 + index)

const formatDateLabel = (date: Date) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date)

const changeYearMonth = (date: Date, year: number, month: number) => {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(date.getDate(), lastDay))
}

type DateJumpDialogProps = {
  initialDate: Date
  today: Date
  onClose: () => void
  onSelect: (date: Date) => void
}

export default function DateJumpDialog({
  initialDate,
  today,
  onClose,
  onSelect,
}: DateJumpDialogProps) {
  const [draftDate, setDraftDate] = useState(() => new Date(initialDate))
  const calendarDays = useMemo(
    () =>
      getCalendarDays(
        new Date(draftDate.getFullYear(), draftDate.getMonth(), 1),
      ),
    [draftDate],
  )
  const draftKey = toDateKey(draftDate)
  const todayKey = toDateKey(today)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const moveMonth = (amount: number) => {
    const targetMonth = draftDate.getMonth() + amount
    const targetYear = draftDate.getFullYear() + Math.floor(targetMonth / 12)
    const normalizedMonth = ((targetMonth % 12) + 12) % 12
    setDraftDate(changeYearMonth(draftDate, targetYear, normalizedMonth))
  }

  const submitDate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSelect(draftDate)
  }

  return (
    <div
      className="date-jump-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="date-jump-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="date-jump-title"
      >
        <div className="date-jump-heading">
          <div>
            <p className="eyebrow">빠른 탐색</p>
            <h2 id="date-jump-title">날짜로 이동</h2>
            <p>연도와 월을 고르고 원하는 날짜로 바로 이동하세요.</p>
          </div>
          <button type="button" aria-label="날짜 이동 창 닫기" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={submitDate}>
          <div className="date-jump-navigation">
            <button
              type="button"
              aria-label="이전 달 보기"
              onClick={() => moveMonth(-1)}
            >
              ‹
            </button>
            <div className="date-jump-selectors">
              <label>
                <span className="sr-only">연도 선택</span>
                <select
                  autoFocus
                  value={draftDate.getFullYear()}
                  onChange={(event) =>
                    setDraftDate(
                      changeYearMonth(
                        draftDate,
                        Number(event.target.value),
                        draftDate.getMonth(),
                      ),
                    )
                  }
                >
                  {yearOptions.map((year) => (
                    <option value={year} key={year}>
                      {year}년
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">월 선택</span>
                <select
                  value={draftDate.getMonth()}
                  onChange={(event) =>
                    setDraftDate(
                      changeYearMonth(
                        draftDate,
                        draftDate.getFullYear(),
                        Number(event.target.value),
                      ),
                    )
                  }
                >
                  {monthLabels.map((label, index) => (
                    <option value={index} key={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              aria-label="다음 달 보기"
              onClick={() => moveMonth(1)}
            >
              ›
            </button>
          </div>

          <div className="date-jump-weekdays" aria-hidden="true">
            {weekdayLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="date-jump-grid">
            {calendarDays.map((date) => {
              const dateKey = toDateKey(date)
              const isOutsideMonth = date.getMonth() !== draftDate.getMonth()
              const isSelected = dateKey === draftKey
              const isToday = dateKey === todayKey

              return (
                <button
                  className={`${isOutsideMonth ? 'outside-month ' : ''}${
                    isSelected ? 'selected' : ''
                  }`}
                  type="button"
                  aria-label={formatDateLabel(date)}
                  aria-pressed={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  onClick={() => setDraftDate(new Date(date))}
                  key={dateKey}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <p className="date-jump-selection" aria-live="polite">
            선택한 날짜 <strong>{formatDateLabel(draftDate)}</strong>
          </p>
          <div className="date-jump-actions">
            <button type="button" onClick={() => setDraftDate(new Date(today))}>
              오늘 선택
            </button>
            <button type="button" onClick={onClose}>
              취소
            </button>
            <button type="submit">이동</button>
          </div>
        </form>
      </section>
    </div>
  )
}
