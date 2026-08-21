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

export const createInitialFocusRecords = (): FocusRecord[] => []
