import { FormEvent, useState } from 'react'
import type { StudyMember, StudyRoom } from '../data/studyRooms'

type StudyRoomChatProps = {
  room: StudyRoom
  me: StudyMember
  onSend: (text: string) => void
}

const formatMessageTime = (createdAt: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(createdAt))

export default function StudyRoomChat({ room, me, onSend }: StudyRoomChatProps) {
  const [message, setMessage] = useState('')

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = message.trim()
    if (!text) return
    onSend(text)
    setMessage('')
  }

  return (
    <section className="study-chat-panel" aria-labelledby="study-chat-title">
      <div className="study-panel-heading">
        <div>
          <p className="eyebrow">멤버 전용</p>
          <h2 id="study-chat-title">모임 채팅</h2>
          <p>계획을 맞추거나 짧은 응원을 편하게 나눠보세요.</p>
        </div>
        <span className="study-chat-member-count">{room.memberCount}명 참여</span>
      </div>

      <div className="study-chat-messages" aria-live="polite">
        {!room.chatMessages.length && (
          <div className="study-chat-empty">
            <span aria-hidden="true">말풍선</span>
            <strong>아직 대화가 없어요.</strong>
            <p>첫 인사를 건네거나 오늘의 계획을 공유해보세요.</p>
          </div>
        )}
        {room.chatMessages.map((item) => {
          const member = room.members.find((candidate) => candidate.id === item.memberId)
          const isMine = item.memberId === me.id
          return (
            <article className={isMine ? 'study-chat-message mine' : 'study-chat-message'} key={item.id}>
              {!isMine && <span className="study-chat-avatar">{member?.avatar ?? '?'}</span>}
              <div>
                {!isMine && <strong>{member?.name ?? '멤버'}</strong>}
                <p>{item.text}</p>
                <time dateTime={item.createdAt}>{formatMessageTime(item.createdAt)}</time>
              </div>
            </article>
          )
        })}
      </div>

      <form className="study-chat-composer" onSubmit={sendMessage}>
        <label htmlFor={`chat-message-${room.id}`}>메시지</label>
        <textarea
          id={`chat-message-${room.id}`}
          value={message}
          maxLength={500}
          rows={2}
          placeholder={`${room.name}에 메시지 보내기`}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
        />
        <button type="submit" disabled={!message.trim()} aria-label="메시지 보내기">
          보내기
        </button>
      </form>
    </section>
  )
}
