'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteMemo, updateMemo } from '@/app/actions/entries'
import { compactDate } from '@/lib/date-labels'

type Memo = { id: string; date: string; text: string | null }

type Props = {
  memos: Memo[]
}

export default function MemoList({ memos }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const result = await updateMemo(id, new FormData(e.currentTarget))
    if (result.error) setError(result.error)
    else {
      setEditingId(null)
      router.refresh()
    }
    setPending(false)
  }

  async function handleDelete(id: string) {
    setPending(true)
    setError(null)
    const result = await deleteMemo(id)
    if (result.error) setError(result.error)
    else {
      setEditingId(null)
      router.refresh()
    }
    setPending(false)
  }

  return (
    <div className="board-v2-memo-feed">
      {memos.map(memo => (
        <article key={memo.id} id={`memo-${memo.id}`} className="board-v2-memo-card">
          {editingId === memo.id ? (
            <form onSubmit={e => handleUpdate(e, memo.id)} className="board-v2-memo-edit-form">
              <input name="date" type="date" defaultValue={memo.date} className="board-v2-modal-input" required />
              <textarea
                name="text"
                defaultValue={memo.text ?? ''}
                className="board-v2-modal-input board-v2-modal-textarea"
                required
                autoFocus
                rows={4}
              />
              {error && <p className="board-v2-modal-error">{error}</p>}
              <div className="board-v2-cal-actions">
                <button type="button" className="board-v2-cal-delete" disabled={pending} onClick={() => handleDelete(memo.id)}>
                  삭제
                </button>
                <button type="button" className="board-v2-cal-cancel" disabled={pending} onClick={() => setEditingId(null)}>
                  취소
                </button>
                <button type="submit" className="board-v2-cal-submit" disabled={pending}>
                  {pending ? '…' : '저장'}
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="board-v2-memo-card-button" onClick={() => setEditingId(memo.id)}>
              <span className="board-v2-memo-date">{compactDate(memo.date)}</span>
              <p className="board-v2-memo-text">{memo.text}</p>
            </button>
          )}
        </article>
      ))}
    </div>
  )
}
