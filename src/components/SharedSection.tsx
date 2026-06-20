'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCalendarGroup, joinCalendarGroup } from '@/app/actions/entries'

type Group = { id: string; name: string; invite_code: string }
type Member = { user_id: string; nickname: string | null }

type Props = {
  group: Group | null
  members: Member[]
}

export default function SharedSection({ group, members }: Props) {
  const [view, setView]         = useState<'idle' | 'create' | 'join'>('idle')
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [newCode, setNewCode]   = useState<string | null>(null)
  const [pending, setPending]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)
  const router = useRouter()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setPending(true); setError(null)
    const res = await createCalendarGroup(groupName)
    if (res.error) { setError(res.error) }
    else { setNewCode(res.invite_code ?? null); setView('idle'); router.refresh() }
    setPending(false)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setPending(true); setError(null)
    const res = await joinCalendarGroup(inviteCode)
    if (res.error) { setError(res.error) }
    else { setView('idle'); router.refresh() }
    setPending(false)
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }

  if (group) {
    return (
      <div className="board-v2-shared">
        <div className="board-v2-shared-header">
          <span className="board-v2-shared-title">🔗 {group.name}</span>
          <button
            type="button"
            className="board-v2-shared-code"
            onClick={() => copy(group.invite_code)}
            title="클릭해서 복사"
          >
            {copied ? '복사됨 ✓' : `초대코드: ${group.invite_code}`}
          </button>
        </div>
        {members.length > 0 && (
          <div className="board-v2-shared-members">
            {members.map(m => (
              <span key={m.user_id} className="board-v2-shared-member">
                {m.nickname ?? '사용자'}
              </span>
            ))}
          </div>
        )}
        {newCode && (
          <p className="board-v2-shared-new-code">
            그룹이 생성됐어요! 초대 코드: <strong>{newCode}</strong>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="board-v2-shared">
      <div className="board-v2-shared-header">
        <span className="board-v2-shared-title">🔗 공유 캘린더</span>
      </div>

      {view === 'idle' && (
        <div className="board-v2-shared-actions">
          <button type="button" className="board-v2-shared-btn" onClick={() => { setView('create'); setError(null) }}>
            그룹 만들기
          </button>
          <button type="button" className="board-v2-shared-btn" onClick={() => { setView('join'); setError(null) }}>
            코드로 참가
          </button>
        </div>
      )}

      {view === 'create' && (
        <form onSubmit={handleCreate} className="board-v2-shared-form">
          <input
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            placeholder="그룹 이름"
            className="board-v2-cal-input"
            required
            autoFocus
          />
          {error && <p className="board-v2-cal-error">{error}</p>}
          <div className="board-v2-cal-actions">
            <button type="button" className="board-v2-cal-cancel" onClick={() => setView('idle')}>취소</button>
            <button type="submit" disabled={pending} className="board-v2-cal-submit">
              {pending ? '…' : '만들기'}
            </button>
          </div>
        </form>
      )}

      {view === 'join' && (
        <form onSubmit={handleJoin} className="board-v2-shared-form">
          <input
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
            placeholder="초대 코드 8자리"
            className="board-v2-cal-input"
            maxLength={8}
            required
            autoFocus
          />
          {error && <p className="board-v2-cal-error">{error}</p>}
          <div className="board-v2-cal-actions">
            <button type="button" className="board-v2-cal-cancel" onClick={() => setView('idle')}>취소</button>
            <button type="submit" disabled={pending} className="board-v2-cal-submit">
              {pending ? '…' : '참가'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
