import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  FocusRecord,
  FocusRecordContext,
  FocusSourceType,
} from '../data/focusRecords'
import {
  finishFocusRecord,
  getFocusDurationSeconds,
  isFocusRecordRunning,
  pauseFocusRecord,
  restartFocusRecord,
  startFocusRecord,
} from '../lib/focus'
import {
  FOCUS_RECORD_STORAGE_KEY,
  FOCUS_STORAGE_KEY,
  readFocusRecords,
  readStorage,
} from '../lib/plannerStorage'
import { useStoredState } from './useStoredState'

type ChangeSourceStatus = (
  source: Pick<FocusRecord, 'sourceType' | 'sourceId' | 'roomId'>,
  completed: boolean,
  changedAt: string,
) => void

export function useFocusSessions(onChangeSourceStatus: ChangeSourceStatus) {
  const [focusRecords, setFocusRecords] = useStoredState(FOCUS_RECORD_STORAGE_KEY, readFocusRecords)
  const [focusResults, setFocusResults] = useStoredState(
    FOCUS_STORAGE_KEY,
    () => readStorage<Record<string, number>>(FOCUS_STORAGE_KEY, () => ({})),
  )
  const [focusNowMs, setFocusNowMs] = useState(Date.now)
  // Event handlers must see earlier commands in the same React batch, so a
  // second finish cannot count the same session twice. All writes go through here.
  const recordsRef = useRef(focusRecords)
  const updateRecords = useCallback((update: (records: FocusRecord[]) => FocusRecord[]) => {
    const nextRecords = update(recordsRef.current)
    recordsRef.current = nextRecords
    setFocusRecords(nextRecords)
  }, [setFocusRecords])

  const unfinishedFocusRecords = useMemo(
    () => focusRecords.filter((record) => !record.endedAt), [focusRecords],
  )
  const activeCount = unfinishedFocusRecords.filter(isFocusRecordRunning).length

  useEffect(() => {
    if (!activeCount) return
    setFocusNowMs(Date.now())
    const timer = window.setInterval(() => setFocusNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [activeCount])

  const beginFocus = useCallback((
    sourceType: FocusSourceType,
    sourceId: string,
    title: string,
    context: FocusRecordContext,
    fromBeginning: boolean,
  ) => {
    const startedAt = new Date().toISOString()
    const record: FocusRecord = {
      id: `focus-${crypto.randomUUID()}`, sourceType, sourceId, title, ...context,
      startedAt, segments: [{ startedAt }],
    }
    onChangeSourceStatus(record, false, startedAt)
    updateRecords((current) => fromBeginning
      ? restartFocusRecord(current, record)
      : startFocusRecord(current, record),
    )
    if (fromBeginning && sourceType === 'todo') {
      setFocusResults((current) => ({ ...current, [sourceId]: 0 }))
    }
  }, [onChangeSourceStatus, setFocusResults, updateRecords])

  const startFocus = useCallback((
    sourceType: FocusSourceType, sourceId: string, title: string, context: FocusRecordContext = {},
  ) => beginFocus(sourceType, sourceId, title, context, false), [beginFocus])

  const restartFocus = useCallback((
    sourceType: FocusSourceType, sourceId: string, title: string, context: FocusRecordContext = {},
  ) => beginFocus(sourceType, sourceId, title, context, true), [beginFocus])

  const pauseFocus = useCallback((recordId: string) => {
    const pausedAt = new Date().toISOString()
    updateRecords((current) => current.map((record) => record.id === recordId
      ? pauseFocusRecord(record, pausedAt)
      : record,
    ))
  }, [updateRecords])

  const pauseAllFocus = useCallback(() => {
    const pausedAt = new Date().toISOString()
    updateRecords((current) => current.map((record) => pauseFocusRecord(record, pausedAt)))
  }, [updateRecords])

  const finishFocus = useCallback((recordId: string) => {
    const record = recordsRef.current.find((candidate) => candidate.id === recordId && !candidate.endedAt)
    if (!record) return
    const endedAt = new Date().toISOString()
    const finished = finishFocusRecord(record, endedAt)
    updateRecords((current) => current.map((candidate) => candidate.id === recordId ? finished : candidate))
    onChangeSourceStatus(record, true, endedAt)
    if (record.sourceType === 'todo') {
      const elapsed = getFocusDurationSeconds(finished)
      setFocusResults((current) => ({
        ...current, [record.sourceId]: (current[record.sourceId] ?? 0) + elapsed,
      }))
    }
  }, [onChangeSourceStatus, setFocusResults, updateRecords])

  return {
    unfinishedFocusRecords, focusResults, focusNowMs,
    startFocus, restartFocus, pauseFocus, pauseAllFocus, finishFocus,
  }
}
