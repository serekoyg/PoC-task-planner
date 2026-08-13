export type FocusSourceType = 'todo' | 'study'

export type FocusRecord = {
  id: string
  sourceType: FocusSourceType
  sourceId: string
  title: string
  startedAt: string
  endedAt?: string
}

export const createInitialFocusRecords = (): FocusRecord[] => []
