import type { ComponentProps } from 'react'
import { useParams } from 'react-router-dom'
import type { Todo } from '../data/initialData'
import type { StudyRoom } from '../data/studyRooms'
import type { FocusRecord } from '../data/focusRecords'
import StudyRoomDetailPage from '../pages/StudyRoomDetailPage'
import StudyRoomManagementPage from '../pages/StudyRoomManagementPage'
import StudyMemberProfilePage from '../pages/StudyMemberProfilePage'
import FocusSessionPage from '../pages/FocusSessionPage'
import FocusResultPage from '../pages/FocusResultPage'

type RoomRouteProps<T> = Omit<T, 'room'> & { rooms: StudyRoom[] }

export function StudyRoomRoute({ rooms, ...props }: RoomRouteProps<ComponentProps<typeof StudyRoomDetailPage>>) {
  const { roomId } = useParams()
  return <StudyRoomDetailPage key={roomId} {...props} room={rooms.find((room) => room.id === roomId)} />
}

export function StudyRoomManagementRoute({ rooms, ...props }: RoomRouteProps<ComponentProps<typeof StudyRoomManagementPage>>) {
  const { roomId } = useParams()
  return <StudyRoomManagementPage key={roomId} {...props} room={rooms.find((room) => room.id === roomId)} />
}

export function StudyMemberProfileRoute({ rooms }: { rooms: StudyRoom[] }) {
  const { roomId, memberId } = useParams()
  const room = rooms.find((candidate) => candidate.id === roomId)
  return <StudyMemberProfilePage room={room} member={room?.members.find((member) => member.id === memberId)} />
}

type FocusSessionRouteProps = Omit<ComponentProps<typeof FocusSessionPage>, 'todo' | 'record'> & {
  todos: Todo[]
  focusRecords: FocusRecord[]
}

export function FocusSessionRoute({ todos, focusRecords, ...props }: FocusSessionRouteProps) {
  const { todoId } = useParams()
  return <FocusSessionPage
    key={todoId}
    {...props}
    todo={todos.find((todo) => todo.id === todoId)}
    record={focusRecords.find((record) => !record.endedAt && record.sourceType === 'todo' && record.sourceId === todoId)}
  />
}

export function FocusResultRoute({ todos, focusResults }: { todos: Todo[]; focusResults: Record<string, number> }) {
  const { todoId } = useParams()
  return <FocusResultPage
    key={todoId}
    todo={todos.find((todo) => todo.id === todoId)}
    focusedSeconds={todoId ? focusResults[todoId] : undefined}
  />
}
