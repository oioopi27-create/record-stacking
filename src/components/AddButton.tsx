'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { addHabit, addExpense, addMemo, addCategory, addPaymentMethod } from '@/app/actions/entries'
import { addSchedule } from '@/app/actions/schedules'
import { createClient } from '@/lib/supabase/client'
import TimePicker from '@/components/TimePicker'

type FormType = '일정' | '습관' | '지출' | '메모'
type Category = { id: string; name: string; color?: string | null }
type PaymentMethod = { id: string; name: string; type: 'card' | 'account' | 'cash' | 'investment' }
type WalletType = PaymentMethod['type']

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

type Props = { type: FormType; label: string; defaultDate?: string }

export default function AddButton({ type, label, defaultDate }: Props) {
  const [open, setOpen]           = useState(false)
  const [pending, setPending]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [schedColor, setSchedColor] = useState('#a8d4f5')
  const [categories, setCategories] = useState<Category[]>([])
  const [selCategory, setSelCategory] = useState('')
  const [newCatName, setNewCatName]   = useState('')
  const [newCatColor, setNewCatColor] = useState('#a8d4f5')
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
  const router = useRouter()

  useEffect(() => {
    if (!open || type !== '일정') return
    const sb = createClient()
    sb.from('schedule_category').select('id, name, color').order('created_at').then(({ data }) => {
      setCategories(data ?? [])
    })
  }, [open, type])

  useEffect(() => {
    if (!open || type !== '지출') return
    const sb = createClient()
    Promise.all([
      sb.from('expense_category').select('id, name').order('created_at'),
      sb.from('payment_method').select('id, name, type').order('sort_order').order('created_at'),
    ]).then(([catResult, methodResult]) => {
      setExpenseCategories(catResult.data ?? [])
      setPaymentMethods((methodResult.data ?? []) as PaymentMethod[])
    })
  }, [open, type])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    if (type === '일정') {
      const catColor = selCategory ? (categories.find(c => c.id === selCategory)?.color ?? null) : null
      fd.set('color', catColor ?? schedColor)
      if (selCategory) fd.set('category_id', selCategory)
    }
    if (type === '지출') {
      fd.set('entry_type', entryType)
      if (selExpenseCategory) fd.set('category_id', selExpenseCategory)
      if (selPaymentMethod) fd.set('payment_method_id', selPaymentMethod)
    }
    let result
    if      (type === '일정') result = await addSchedule(fd)
    else if (type === '습관') result = await addHabit(fd)
    else if (type === '지출') result = await addExpense(fd)
    else                       result = await addMemo(fd)

    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
      setError(null)
      setSchedColor('#a8d4f5')
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
    setOpen(false)
    setError(null)
    setAddingCat(false)
    setNewCatName('')
    setAddingMethod(false)
    setNewMethodName('')
  }

  const today = defaultDate || todayStr()

  return (
    <>
      <button type="button" className="board-v2-page-add-btn" onClick={() => setOpen(true)}>
        + {label}
      </button>

      {open && (
        <div className="board-v2-modal-overlay" onClick={closeModal}>
          <div className="board-v2-modal" onClick={e => e.stopPropagation()}>
            <div className="board-v2-modal-header">
              <span>{label}</span>
              <button type="button" onClick={closeModal} className="board-v2-modal-close">×</button>
            </div>
            <form onSubmit={handleSubmit} className="board-v2-modal-form">
              {type === '일정' && (
                <>
                  <input name="title" placeholder="일정 이름" className="board-v2-modal-input" required autoFocus />
                  <input name="date" type="date" defaultValue={today} className="board-v2-modal-input" required />
                  <TimePicker name="time" endName="time_end" />
                  <div className="board-v2-cat-color-picker">
                    <div className="board-v2-cat-color-swatches">
                      <button
                        type="button"
                        className={`board-v2-cat-color-item is-none${!selCategory && !addingCat ? ' is-selected' : ''}`}
                        onClick={() => { setSelCategory(''); setAddingCat(false) }}
                      >없음</button>
                      {categories.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className={`board-v2-cat-color-item${selCategory === c.id ? ' is-selected' : ''}`}
                          data-color={c.color ?? ''}
                          style={{ '--cat-dot-color': c.color ?? '' } as React.CSSProperties}
                          onClick={() => { setSelCategory(c.id); setAddingCat(false) }}
                        >{c.name}</button>
                      ))}
                      <button
                        type="button"
                        className={`board-v2-cat-color-item is-add${addingCat ? ' is-selected' : ''}`}
                        onClick={() => { setAddingCat(v => !v); if (!addingCat) setSelCategory('') }}
                      >+ 추가</button>
                    </div>
                  </div>
                  {addingCat && (
                    <div className="board-v2-cat-new-form">
                      <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="카테고리 이름" className="board-v2-modal-input" />
                      <div className="board-v2-cat-new-color-row">
                        <span className="board-v2-color-label">색상</span>
                        <input
                          type="color"
                          className="board-v2-color-input"
                          value={newCatColor}
                          onChange={e => setNewCatColor(e.target.value)}
                        />
                      </div>
                      <button type="button" className="board-v2-modal-submit" disabled={catPending || !newCatName.trim()} onClick={handleAddCategory}>
                        {catPending ? '…' : '카테고리 저장'}
                      </button>
                    </div>
                  )}
                </>
              )}
              {type === '습관' && (
                <input name="name" placeholder="새 습관 이름 (예: 매일 운동)" className="board-v2-modal-input" required autoFocus />
              )}
              {type === '지출' && (
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
              {type === '메모' && (
                <>
                  <textarea name="text" placeholder="메모를 남겨보세요" className="board-v2-modal-input board-v2-modal-textarea" required autoFocus rows={4} />
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
