'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { addHabit, addExpense, addMemo, addCategory, addPaymentMethod } from '@/app/actions/entries'
import { addSchedule } from '@/app/actions/schedules'
import { createClient } from '@/lib/supabase/client'
import TimePicker from '@/components/TimePicker'

type ItemType = '일정' | '습관' | '지출' | '메모'
type Category = { id: string; name: string; color?: string | null }
type PaymentMethod = { id: string; name: string; type: 'card' | 'account' | 'cash' | 'investment' }
type WalletType = PaymentMethod['type']

const ITEMS: { label: ItemType; emoji: string }[] = [
  { label: '일정', emoji: '📅' },
  { label: '습관', emoji: '✅' },
  { label: '지출', emoji: '💸' },
  { label: '메모', emoji: '📝' },
]

const COLORS = [
  '#ffb5a3', '#ffcba4', '#fff0a3', '#c8e6c0', '#a8e6d9',
  '#a8d4f5', '#b8b5f0', '#d4b5f0', '#e8dcc8', '#d4d4d4',
]

const WALLET_TYPES: { value: WalletType; label: string }[] = [
  { value: 'card', label: '카드' },
  { value: 'account', label: '통장' },
  { value: 'cash', label: '현금' },
  { value: 'investment', label: '주식 계좌' },
]

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function PlusMenu() {
  const [open, setOpen]           = useState(false)
  const [modal, setModal]         = useState<ItemType | null>(null)
  const [pending, setPending]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Schedule-specific state
  const [schedColor, setSchedColor]   = useState<string>('')
  const [categories, setCategories]   = useState<Category[]>([])
  const [selCategory, setSelCategory] = useState<string>('')
  const [newCatName, setNewCatName]   = useState('')
  const [newCatColor, setNewCatColor] = useState(COLORS[5])
  const [addingCat, setAddingCat]     = useState(false)
  const [catPending, setCatPending]   = useState(false)
  const [entryType, setEntryType] = useState<'expense' | 'income'>('expense')
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selExpenseCategory, setSelExpenseCategory] = useState('')
  const [selPaymentMethod, setSelPaymentMethod] = useState('')
  const [addingMethod, setAddingMethod] = useState(false)
  const [newMethodName, setNewMethodName] = useState('')
  const [newMethodType, setNewMethodType] = useState<WalletType>('card')
  const [methodPending, setMethodPending] = useState(false)

  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (modal !== '일정') return
    const sb = createClient()
    sb.from('schedule_category').select('id, name, color').order('created_at').then(({ data }) => {
      setCategories(data ?? [])
    })
  }, [modal])

  useEffect(() => {
    if (modal !== '지출') return
    const sb = createClient()
    Promise.all([
      sb.from('expense_category').select('id, name').order('created_at'),
      sb.from('payment_method').select('id, name, type').order('sort_order').order('created_at'),
    ]).then(([catResult, methodResult]) => {
      setExpenseCategories(catResult.data ?? [])
      setPaymentMethods((methodResult.data ?? []) as PaymentMethod[])
    })
  }, [modal])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const fd = new FormData(e.currentTarget)

    if (modal === '일정') {
      if (schedColor) fd.set('color', schedColor)
      if (selCategory) fd.set('category_id', selCategory)
    }
    if (modal === '지출') {
      fd.set('entry_type', entryType)
      if (selExpenseCategory) fd.set('category_id', selExpenseCategory)
      if (selPaymentMethod) fd.set('payment_method_id', selPaymentMethod)
    }

    let result
    if (modal === '일정')     result = await addSchedule(fd)
    else if (modal === '습관') result = await addHabit(fd)
    else if (modal === '지출') result = await addExpense(fd)
    else if (modal === '메모') result = await addMemo(fd)
    else { setPending(false); return }

    if (result.error) {
      setError(result.error)
    } else {
      setModal(null)
      setError(null)
      setSchedColor('')
      setSelCategory('')
      setSelExpenseCategory('')
      setSelPaymentMethod('')
      router.refresh()
    }
    setPending(false)
  }

  async function handleAddPaymentMethod() {
    if (!newMethodName.trim()) return
    setMethodPending(true)
    const res = await addPaymentMethod(newMethodName, newMethodType)
    if (!res.error && res.id) {
      const created = { id: res.id, name: newMethodName.trim(), type: newMethodType }
      setPaymentMethods(prev => [...prev, created])
      setSelPaymentMethod(created.id)
      setNewMethodName('')
      setAddingMethod(false)
    }
    setMethodPending(false)
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return
    setCatPending(true)
    const res = await addCategory(newCatName, newCatColor)
    if (!res.error && res.id) {
      const created = { id: res.id, name: newCatName.trim(), color: newCatColor }
      setCategories(prev => [...prev, created])
      setSelCategory(created.id)
      setNewCatName('')
      setAddingCat(false)
    }
    setCatPending(false)
  }

  function closeModal() {
    setModal(null)
    setError(null)
    setAddingCat(false)
    setNewCatName('')
    setAddingMethod(false)
    setNewMethodName('')
  }

  function openModal(label: ItemType) {
    setOpen(false)
    setModal(label)
  }

  const today = todayStr()

  return (
    <>
      <div className="board-v2-plus-wrap" ref={ref}>
        {open && (
          <div className="board-v2-plus-menu" role="menu">
            {ITEMS.map(item => (
              <button
                key={item.label}
                type="button"
                className="board-v2-plus-item"
                role="menuitem"
                onClick={() => openModal(item.label)}
              >
                <span className="board-v2-plus-emoji">{item.emoji}</span>
                {item.label === '지출' ? '지갑' : item.label}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className={`board-v2-plus${open ? ' is-open' : ''}`}
          aria-label="추가"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          +
        </button>
      </div>

      {modal && (
        <div className="board-v2-modal-overlay" onClick={closeModal}>
          <div className="board-v2-modal" onClick={e => e.stopPropagation()}>
            <div className="board-v2-modal-header">
              <span>{ITEMS.find(i => i.label === modal)?.emoji} {modal === '지출' ? '지갑 기록' : `${modal} 추가`}</span>
              <button type="button" onClick={closeModal} className="board-v2-modal-close">×</button>
            </div>

            <form onSubmit={handleSubmit} className="board-v2-modal-form">

              {modal === '일정' && (
                <>
                  <input name="title" placeholder="일정 이름" className="board-v2-modal-input" required autoFocus />

                  {/* date + time */}
                  <input name="date" type="date" defaultValue={today} className="board-v2-modal-input" required />
                  <TimePicker name="time" endName="time_end" />

                  {/* color picker */}
                  <div className="board-v2-color-row">
                    <span className="board-v2-color-label">색상</span>
                    <div className="board-v2-color-picks">
                      <button type="button"
                        className={`board-v2-color-dot board-v2-color-none${schedColor === '' ? ' is-selected' : ''}`}
                        onClick={() => setSchedColor('')} title="색상 없음" />
                      {COLORS.map(c => (
                        <button
                          key={c} type="button"
                          className={`board-v2-color-dot${schedColor === c ? ' is-selected' : ''}`}
                          style={{ background: c }}
                          onClick={() => setSchedColor(c)}
                          aria-label={c}
                        />
                      ))}
                    </div>
                  </div>

                  {/* category selector */}
                  <div className="board-v2-cat-row">
                    <select
                      className="board-v2-modal-input board-v2-cat-select"
                      value={selCategory}
                      onChange={e => setSelCategory(e.target.value)}
                    >
                      <option value="">카테고리 없음</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button type="button" className="board-v2-cat-add-btn" onClick={() => setAddingCat(v => !v)}>
                      {addingCat ? '✕' : '+ 추가'}
                    </button>
                  </div>

                  {addingCat && (
                    <div className="board-v2-cat-new">
                      <input
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        placeholder="카테고리 이름"
                        className="board-v2-modal-input"
                      />
                      <div className="board-v2-color-picks board-v2-color-picks-sm">
                        {COLORS.map(c => (
                          <button
                            key={c} type="button"
                            className={`board-v2-color-dot board-v2-color-dot-sm${newCatColor === c ? ' is-selected' : ''}`}
                            style={{ background: c }}
                            onClick={() => setNewCatColor(c)}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        className="board-v2-modal-submit"
                        disabled={catPending || !newCatName.trim()}
                        onClick={handleAddCategory}
                      >
                        {catPending ? '…' : '카테고리 저장'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {modal === '습관' && (
                <input name="name" placeholder="습관 이름" className="board-v2-modal-input" required autoFocus />
              )}

              {modal === '지출' && (
                <>
                  <div className="board-v2-wallet-type-toggle">
                    <button
                      type="button"
                      className={entryType === 'expense' ? 'is-active' : ''}
                      onClick={() => setEntryType('expense')}
                    >지출 -</button>
                    <button
                      type="button"
                      className={entryType === 'income' ? 'is-active' : ''}
                      onClick={() => setEntryType('income')}
                    >수입 +</button>
                  </div>
                  <input name="title" placeholder={entryType === 'income' ? '수입 항목' : '지갑 항목'} className="board-v2-modal-input" required autoFocus />
                  <div className="board-v2-modal-row">
                    <input name="amount" type="number" placeholder="금액 (원)" className="board-v2-modal-input" required min={1} />
                    <input name="date" type="date" defaultValue={today} className="board-v2-modal-input" required />
                  </div>
                  <div className="board-v2-cat-row">
                    <select className="board-v2-modal-input board-v2-cat-select" value={selExpenseCategory} onChange={e => setSelExpenseCategory(e.target.value)}>
                      <option value="">지출 카테고리 없음</option>
                      {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select className="board-v2-modal-input board-v2-cat-select" value={selPaymentMethod} onChange={e => setSelPaymentMethod(e.target.value)}>
                      <option value="">지갑 수단 없음</option>
                      {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <button type="button" className="board-v2-cat-add-btn" onClick={() => setAddingMethod(v => !v)}>
                    {addingMethod ? '닫기' : '+ 지갑 수단 추가'}
                  </button>
                  {addingMethod && (
                    <div className="board-v2-cat-new">
                      <input value={newMethodName} onChange={e => setNewMethodName(e.target.value)} placeholder="예: 국민카드, 토스통장" className="board-v2-modal-input" />
                      <div className="board-v2-wallet-method-types">
                        {WALLET_TYPES.map(item => (
                          <button
                            key={item.value}
                            type="button"
                            className={newMethodType === item.value ? 'is-active' : ''}
                            onClick={() => setNewMethodType(item.value)}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <button type="button" className="board-v2-modal-submit" disabled={methodPending || !newMethodName.trim()} onClick={handleAddPaymentMethod}>
                        {methodPending ? '…' : '지갑 수단 저장'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {modal === '메모' && (
                <>
                  <textarea name="text" placeholder="오늘의 메모를 남겨보세요" className="board-v2-modal-input board-v2-modal-textarea" required autoFocus rows={4} />
                  <input name="date" type="date" defaultValue={today} className="board-v2-modal-input" required />
                </>
              )}

              {error && <p className="board-v2-modal-error">{error}</p>}
              <div className="board-v2-modal-actions">
                <button type="button" onClick={closeModal} className="board-v2-modal-cancel">취소</button>
                <button type="submit" disabled={pending} className="board-v2-modal-submit">
                  {pending ? '저장 중…' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
