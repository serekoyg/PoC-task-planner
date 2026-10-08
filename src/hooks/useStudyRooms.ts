import { useCallback, useMemo } from 'react'
import type {
  StudyProfileVisibility,
  StudyRoom,
  StudyRoomCreateInput,
  StudySharedItemInput,
} from '../data/studyRooms'
import { STUDY_STORAGE_KEY, readStudyRooms } from '../lib/plannerStorage'
import {
  getSharedItemEntries,
  setRoomTodoCompleted,
  toggleRoomSharedItemStatus,
} from '../lib/studyPlans'
import { useStoredState } from './useStoredState'

export function useStudyRooms() {
  const [studyRooms, setStudyRooms] = useStoredState(STUDY_STORAGE_KEY, readStudyRooms)
  const joinedStudyRooms = useMemo(
    () => studyRooms.filter((room) => room.joined),
    [studyRooms],
  )
  const myProfileVisibility = useMemo<StudyProfileVisibility>(
    () =>
      studyRooms
        .flatMap((room) => room.members)
        .find((member) => member.isMe)?.profileVisibility ?? 'roomMembers',
    [studyRooms],
  )
  const sharedItemEntries = useMemo(() => getSharedItemEntries(studyRooms), [studyRooms])

  const requestStudyRoomJoin = (roomId: string) => {
    setStudyRooms((current) =>
      current.map((room) => {
        if (
          room.id !== roomId ||
          room.joined ||
          room.inviteOnly ||
          room.memberCount >= room.maxMembers ||
          room.joinRequests.some((request) => request.applicantId === 'me')
        ) {
          return room
        }

        return {
          ...room,
          joinRequests: [
            ...room.joinRequests,
            {
              id: `request-${crypto.randomUUID()}`,
              applicantId: 'me',
              name: '민서',
              avatar: '민',
              message: `${room.goal} 목표를 함께 이어가고 싶어요.`,
              requestedAt: new Date().toISOString(),
            },
          ],
        }
      }),
    )
  }

  const changeStudyRoom = (
    roomId: string,
    update: (current: StudyRoom) => StudyRoom,
  ) => {
    setStudyRooms((current) =>
      current.map((room) => (room.id === roomId ? update(room) : room)),
    )
  }

  const updateMyProfileVisibility = (
    visibility: StudyProfileVisibility,
  ) => {
    setStudyRooms((current) =>
      current.map((room) => ({
        ...room,
        members: room.members.map((member) =>
          member.isMe
            ? { ...member, profileVisibility: visibility }
            : member,
        ),
      })),
    )
  }

  const toggleSharedItemStatus = (roomId: string, itemId: string) => {
    const changedAt = new Date().toISOString()
    changeStudyRoom(roomId, (room) => toggleRoomSharedItemStatus(room, itemId, changedAt))
  }

  const setSharedTodoCompleted = useCallback((roomId: string, itemId: string, completed: boolean, changedAt: string) => {
    setStudyRooms((current) => current.map((room) => room.id === roomId
      ? setRoomTodoCompleted(room, itemId, completed, changedAt)
      : room,
    ))
  }, [setStudyRooms])

  const updateSharedItem = (
    roomId: string,
    itemId: string,
    input: StudySharedItemInput,
  ) => {
    changeStudyRoom(roomId, (room) => ({
      ...room,
      sharedItems: room.sharedItems.map((item) =>
        item.id === itemId ? { ...item, ...input } : item,
      ),
    }))
  }

  const createStudyRoom = (input: StudyRoomCreateInput) => {
    const roomId = `study-${crypto.randomUUID()}`
    const accents: StudyRoom['accent'][] = ['coral', 'blue', 'green', 'violet']

    setStudyRooms((current) => [
      {
        ...input,
        id: roomId,
        accent: accents[current.length % accents.length],
        memberCount: 1,
        joined: true,
        visibility: 'public',
        todayMinutes: 0,
        weeklyProgress: 0,
        streak: 1,
        ownerId: 'me',
        managerIds: [],
        allowMemberSharing: true,
        membershipManagementVersion: 1,
        joinRequests: [],
        sharedItems: [],
        chatMessages: [],
        members: [
          {
            id: 'me',
            name: '민서',
            avatar: '민',
            minutes: 0,
            status: 'resting',
            focusLabel: '첫 활동을 준비 중이에요',
            isMe: true,
            weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
            profileVisibility: myProfileVisibility,
            bio: '매일 조금씩 꾸준하게 이어가고 있어요.',
          },
        ],
      },
      ...current,
    ])

    return roomId
  }

  return {
    studyRooms, joinedStudyRooms, myProfileVisibility, sharedItemEntries,
    requestStudyRoomJoin, changeStudyRoom, updateMyProfileVisibility,
    toggleSharedItemStatus, setSharedTodoCompleted, updateSharedItem, createStudyRoom,
  }
}
