'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  addFocusItem,
  deleteFocusItem,
  toggleFocusItem,
  updateFocusItem,
} from '@/app/actions/focus'

type FocusItem = {
  id: string
  text: string
  is_done: boolean
}

type Props = {
  dateKey: string
  initialItems: FocusItem[]
}

export default function TodayFocusList({ dateKey, initialItems }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [items, setItems] = useState(initialItems)
  const [text, setText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  async function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    const formData = new FormData(event.currentTarget)
    formData.set('date', dateKey)
    const result = await addFocusItem(formData)
    if (!result.error) {
      if (result.item) setItems(prev => [...prev, result.item as FocusItem])
      setText('')
      startTransition(() => router.refresh())
    }
  }

  async function toggleItem(item: FocusItem) {
    setItems(prev => prev.map(current => (
      current.id === item.id ? { ...current, is_done: !item.is_done } : current
    )))
    const result = await toggleFocusItem(item.id, !item.is_done)
    if (!result.error) {
      if (result.item) {
        setItems(prev => prev.map(current => current.id === item.id ? result.item as FocusItem : current))
      }
      startTransition(() => router.refresh())
    }
  }

  function startEdit(item: FocusItem) {
    setEditingId(item.id)
    setEditText(item.text)
  }

  async function saveEdit(id: string) {
    const trimmed = editText.trim()
    if (!trimmed) return
    setItems(prev => prev.map(item => item.id === id ? { ...item, text: trimmed } : item))
    setEditingId(null)
    const result = await updateFocusItem(id, trimmed)
    if (!result.error) {
      if (result.item) {
        setItems(prev => prev.map(item => item.id === id ? result.item as FocusItem : item))
      }
      startTransition(() => router.refresh())
    }
  }

  async function removeItem(id: string) {
    setItems(prev => prev.filter(item => item.id !== id))
    if (editingId === id) setEditingId(null)
    const result = await deleteFocusItem(id)
    if (!result.error) startTransition(() => router.refresh())
  }

  return (
    <section className="board-v2-focus" aria-busy={isPending}>
      <div className="board-v2-focus-title">오늘의 집중</div>
      <form onSubmit={addItem} className="board-v2-focus-form">
        <input
          name="text"
          value={text}
          onChange={event => setText(event.target.value)}
          placeholder="오늘 집중할 일을 적어 주세요"
        />
        <button type="submit">추가</button>
      </form>
      {items.length > 0 && (
        <ul className="board-v2-focus-list">
          {items.map(item => (
            <li key={item.id}>
              {editingId === item.id ? (
                <div className="board-v2-focus-edit-row">
                  <input
                    className="board-v2-focus-edit-input"
                    value={editText}
                    onChange={event => setEditText(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') saveEdit(item.id)
                      if (event.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                  />
                  <button type="button" className="board-v2-focus-save-btn" onClick={() => saveEdit(item.id)}>저장</button>
                  <button type="button" className="board-v2-focus-del-btn" onClick={() => removeItem(item.id)}>삭제</button>
                </div>
              ) : (
                <div className="board-v2-focus-item-row">
                  <button
                    type="button"
                    className={`board-v2-focus-check${item.is_done ? ' is-done' : ''}`}
                    onClick={() => toggleItem(item)}
                  >
                    {item.text}
                  </button>
                  <button type="button" className="board-v2-focus-edit-btn" onClick={() => startEdit(item)}>
                    편집
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
