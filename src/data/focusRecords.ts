export type FocusSourceType = 'todo' | 'study'

export type FocusSegment = {
  startedAt: string
  endedAt?: string
}

export type FocusRecordContext = {
  roomId?: string
}

export type FocusRecord = FocusRecordContext & {
  id: string
  sourceType: FocusSourceType
  sourceId: string
  title: string
  startedAt: string
  endedAt?: string
  segments?: FocusSegment[]
}

export type FocusActions = {
  onStartFocus: (sourceType: FocusSourceType, sourceId: string, title: string, context?: FocusRecordContext) => void
  onRestartFocus: (sourceType: FocusSourceType, sourceId: string, title: string, context?: FocusRecordContext) => void
  onPauseFocus: (recordId: string) => void
  onFinishFocus: (recordId: string) => void
}

export const createInitialFocusRecords = (): FocusRecord[] => []
