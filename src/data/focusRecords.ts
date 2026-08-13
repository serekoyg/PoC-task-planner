export type FocusSourceType = 'todo' | 'study'

export type FocusSegment = {
  startedAt: string
  endedAt?: string
}

export type FocusRecord = {
  id: string
  sourceType: FocusSourceType
  sourceId: string
  title: string
  startedAt: string
  endedAt?: string
  segments?: FocusSegment[]
}

export const createInitialFocusRecords = (): FocusRecord[] => []
