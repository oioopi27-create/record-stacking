'use client'

import { useState, useTransition } from 'react'
import { addCategory } from '@/app/actions/entries'
import { useRouter } from 'next/navigation'

const DEFAULT_COLOR = '#3b82f6'

export default function CategoryQuickAdd() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    startTransition(async () => {
      await addCategory(name.trim(), color)
      setName('')
      setColor(DEFAULT_COLOR)
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        className="board-v2-cat-quick-add-btn"
        onClick={() => setOpen(true)}
      >
        + 카테고리
      </button>
    )
  }

  return (
    <form className="board-v2-cat-quick-add-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="board-v2-cat-quick-add-input"
        placeholder="카테고리 이름"
        value={name}
        onChange={e => setName(e.target.value)}
        autoFocus
        maxLength={20}
      />
      <div className="board-v2-cat-quick-add-color-row">
        <span className="board-v2-cat-quick-add-color-label">색상</span>
        <label
          className="board-v2-cat-color-swatch board-v2-cat-color-swatch-custom is-selected"
          style={{ background: color }}
          title="색상 선택"
        >
          <input
            type="color"
            className="board-v2-cat-color-picker-input"
            value={color}
            onChange={e => setColor(e.target.value)}
          />
        </label>
      </div>
      <div className="board-v2-cat-quick-add-actions">
        <button
          type="button"
          className="board-v2-cat-quick-cancel"
          onClick={() => { setOpen(false); setName('') }}
        >
          취소
        </button>
        <button
          type="submit"
          className="board-v2-cat-quick-save"
          disabled={isPending || !name.trim()}
        >
          {isPending ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  )
}
