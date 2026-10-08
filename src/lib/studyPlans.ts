import type { StudyRoom, StudySharedItem, StudySharedItemEntry } from '../data/studyRooms'

export const canManageSharedItem = (room: StudyRoom, item: StudySharedItem, memberId: string) =>
  room.ownerId === memberId || room.managerIds.includes(memberId) || item.createdById === memberId

export const getSharedItemEntries = (rooms: StudyRoom[]): StudySharedItemEntry[] =>
  rooms.filter((room) => room.joined).flatMap((room) => {
    const me = room.members.find((member) => member.isMe)
    if (!me) return []
    return room.sharedItems.map((item) => ({
      roomId: room.id,
      roomName: room.name,
      memberId: me.id,
      canManage: canManageSharedItem(room, item, me.id),
      item,
    }))
  })

export const isSharedItemActive = (item: StudySharedItem, memberId: string) =>
  (item.type === 'todo' ? item.completedMemberIds : item.participantMemberIds).includes(memberId)

// Todo completion and event participation are separate member-specific states.
export function setSharedItemStatus(
  item: StudySharedItem,
  memberId: string,
  active: boolean,
  changedAt: string,
): StudySharedItem {
  if (isSharedItemActive(item, memberId) === active) return item
  const memberIds = item.type === 'todo' ? item.completedMemberIds : item.participantMemberIds
  const nextMemberIds = active
    ? [...memberIds, memberId]
    : memberIds.filter((id) => id !== memberId)

  if (item.type === 'event') return { ...item, participantMemberIds: nextMemberIds }

  const completedAtByMember = { ...item.completedAtByMember }
  if (active) completedAtByMember[memberId] = changedAt
  else delete completedAtByMember[memberId]
  return { ...item, completedMemberIds: nextMemberIds, completedAtByMember }
}

function updateMySharedItem(
  room: StudyRoom,
  itemId: string,
  update: (item: StudySharedItem, memberId: string) => StudySharedItem,
): StudyRoom {
  const me = room.members.find((member) => member.isMe)
  const item = room.sharedItems.find((candidate) => candidate.id === itemId)
  if (!me || !item) return room
  const updatedItem = update(item, me.id)
  if (updatedItem === item) return room
  return {
    ...room,
    sharedItems: room.sharedItems.map((candidate) => candidate.id === itemId ? updatedItem : candidate),
  }
}

export const toggleRoomSharedItemStatus = (room: StudyRoom, itemId: string, changedAt: string) =>
  updateMySharedItem(room, itemId, (item, memberId) =>
    setSharedItemStatus(item, memberId, !isSharedItemActive(item, memberId), changedAt),
  )

export const setRoomTodoCompleted = (room: StudyRoom, itemId: string, completed: boolean, changedAt: string) =>
  updateMySharedItem(room, itemId, (item, memberId) => item.type === 'todo'
    ? setSharedItemStatus(item, memberId, completed, changedAt)
    : item,
  )
