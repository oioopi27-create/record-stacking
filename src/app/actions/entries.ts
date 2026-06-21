'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type EntryResult = { error: string | null }

export async function addSchedule(formData: FormData): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const title = (formData.get('title') as string)?.trim()
  const date = formData.get('date') as string
  const time = (formData.get('time') as string) || null
  const timeEnd = (formData.get('time_end') as string) || null
  const color = (formData.get('color') as string) || null
  const categoryId = (formData.get('category_id') as string) || null

  if (!title || !date) return { error: '내용을 입력해주세요' }

  const payload: Record<string, unknown> = { user_id: user.id, title, date }
  if (time)       payload.time        = time
  if (timeEnd)    payload.time_end    = timeEnd
  if (color)      payload.color       = color
  if (categoryId) payload.category_id = categoryId

  let { error } = await supabase.from('schedule').insert(payload)
  if (error) {
    const msg = error.message ?? ''
    if (['color', 'time_end', 'category_id'].some(f => msg.includes(f))) {
      const safe: Record<string, unknown> = { user_id: user.id, title, date }
      if (time) safe.time = time
      const r2 = await supabase.from('schedule').insert(safe)
      error = r2.error
    }
  }
  if (error) return { error: error.message || '저장에 실패했습니다' }

  revalidatePath('/week')
  revalidatePath('/schedule')
  return { error: null }
}

export async function updateSchedule(id: string, formData: FormData): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const title = (formData.get('title') as string)?.trim()
  const time  = (formData.get('time') as string) || null
  const color = (formData.get('color') as string) || null

  if (!title) return { error: '제목을 입력해주세요' }

  const payload: Record<string, unknown> = { title, time, color }

  let { error } = await supabase
    .from('schedule').update(payload).eq('id', id).eq('user_id', user.id)
  if (error) {
    const msg = error.message ?? ''
    if (['color', 'time_end'].some(f => msg.includes(f))) {
      const r2 = await supabase
        .from('schedule').update({ title, time }).eq('id', id).eq('user_id', user.id)
      error = r2.error
    }
  }
  if (error) return { error: error.message || '수정에 실패했습니다' }

  revalidatePath('/week')
  revalidatePath('/schedule')
  return { error: null }
}

export async function deleteSchedule(id: string): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const { error } = await supabase
    .from('schedule').delete().eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message || '삭제에 실패했습니다' }

  revalidatePath('/week')
  revalidatePath('/schedule')
  return { error: null }
}

export async function addCategory(name: string, color: string): Promise<EntryResult & { id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const trimmed = name.trim()
  if (!trimmed) return { error: '카테고리 이름을 입력해주세요' }

  const { data, error } = await supabase
    .from('schedule_category')
    .insert({ user_id: user.id, name: trimmed, color })
    .select('id')
    .single()
  if (error) return { error: '저장에 실패했습니다' }

  revalidatePath('/schedule')
  revalidatePath('/week')
  return { error: null, id: data.id }
}

export async function updateCategory(id: string, name: string, color: string): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const trimmed = name.trim()
  if (!trimmed) return { error: '카테고리 이름을 입력해주세요' }

  const { error } = await supabase
    .from('schedule_category')
    .update({ name: trimmed, color })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: '수정에 실패했습니다' }

  revalidatePath('/schedule')
  revalidatePath('/week')
  return { error: null }
}

export async function deleteCategory(id: string): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const { error } = await supabase
    .from('schedule_category')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: '삭제에 실패했습니다' }

  revalidatePath('/schedule')
  revalidatePath('/week')
  return { error: null }
}

export async function addExpenseCategory(name: string, color: string): Promise<EntryResult & { id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const trimmed = name.trim()
  if (!trimmed) return { error: '카테고리 이름을 입력해주세요' }

  let { data, error } = await supabase
    .from('expense_category')
    .insert({ user_id: user.id, name: trimmed, color })
    .select('id')
    .single()
  if (error && (error.message ?? '').includes('color')) {
    const fallback = await supabase
      .from('expense_category')
      .insert({ user_id: user.id, name: trimmed })
      .select('id')
      .single()
    data = fallback.data
    error = fallback.error
  }
  if (error) return { error: '저장에 실패했습니다' }

  revalidatePath('/expense')
  revalidatePath('/week')
  return { error: null, id: data?.id }
}

export async function updateExpenseCategory(id: string, name: string, color: string): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const trimmed = name.trim()
  if (!trimmed) return { error: '카테고리 이름을 입력해주세요' }

  let { error } = await supabase
    .from('expense_category')
    .update({ name: trimmed, color })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error && (error.message ?? '').includes('color')) {
    const fallback = await supabase
      .from('expense_category')
      .update({ name: trimmed })
      .eq('id', id)
      .eq('user_id', user.id)
    error = fallback.error
  }
  if (error) return { error: '수정에 실패했습니다' }

  revalidatePath('/expense')
  revalidatePath('/week')
  return { error: null }
}

export async function deleteExpenseCategory(id: string): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const { error } = await supabase
    .from('expense_category')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: '삭제에 실패했습니다' }

  revalidatePath('/expense')
  revalidatePath('/week')
  return { error: null }
}

export async function saveHabitReview(
  habitId: string,
  monthStart: string,
  review: string,
): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const { data: habit } = await supabase
    .from('habit')
    .select('id')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single()
  if (!habit) return { error: '습관을 찾을 수 없습니다' }

  const { error } = await supabase
    .from('habit_review')
    .upsert(
      {
        user_id: user.id,
        habit_id: habitId,
        month_start: monthStart,
        review: review.trim(),
      },
      { onConflict: 'user_id,habit_id,month_start' },
    )

  if (error) return { error: error.message || '리뷰 저장에 실패했습니다' }

  revalidatePath('/habit')
  revalidatePath('/week')
  return { error: null }
}

export async function addHabit(formData: FormData): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: '습관 이름을 입력해주세요' }

  const { error } = await supabase.from('habit').insert({ user_id: user.id, name })
  if (error) return { error: '저장에 실패했습니다' }

  revalidatePath('/habit')
  revalidatePath('/week')
  return { error: null }
}

export async function renameHabit(habitId: string, name: string): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const trimmed = name.trim()
  if (!trimmed) return { error: '이름을 입력해주세요' }

  const { error } = await supabase
    .from('habit')
    .update({ name: trimmed })
    .eq('id', habitId)
    .eq('user_id', user.id)
  if (error) return { error: '수정에 실패했습니다' }

  revalidatePath('/habit')
  revalidatePath('/week')
  return { error: null }
}

export async function deleteHabit(habitId: string): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const { error } = await supabase
    .from('habit')
    .delete()
    .eq('id', habitId)
    .eq('user_id', user.id)
  if (error) return { error: '삭제에 실패했습니다' }

  revalidatePath('/habit')
  revalidatePath('/week')
  return { error: null }
}

export async function toggleHabitCheck(habitId: string, date: string, checked: boolean): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const { error } = await supabase
    .from('habit_check')
    .upsert({ habit_id: habitId, date, is_checked: checked }, { onConflict: 'habit_id,date' })
  if (error) return { error: '저장에 실패했습니다' }

  revalidatePath('/habit')
  revalidatePath('/week')
  return { error: null }
}

export async function addExpense(formData: FormData): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const title = (formData.get('title') as string)?.trim()
  const amountRaw = formData.get('amount') as string
  const date = formData.get('date') as string
  const entryType = formData.get('entry_type') === 'income' ? 'income' : 'expense'
  const categoryId = (formData.get('category_id') as string) || null
  const paymentMethodId = (formData.get('payment_method_id') as string) || null
  const amount = parseInt(amountRaw?.replace(/[^0-9]/g, '') ?? '', 10)

  if (!title || !date || !amount || amount <= 0) return { error: '내용을 입력해주세요' }

  const payload: Record<string, unknown> = {
    user_id: user.id,
    title,
    amount,
    date,
    entry_type: entryType,
  }
  if (categoryId) payload.category_id = categoryId
  if (paymentMethodId) payload.payment_method_id = paymentMethodId

  let { error } = await supabase.from('expense').insert(payload)
  if (error) {
    const msg = error.message ?? ''
    if (['entry_type', 'category_id', 'payment_method_id'].some(field => msg.includes(field))) {
      const fallback = await supabase.from('expense').insert({ user_id: user.id, title, amount, date })
      error = fallback.error
    }
  }
  if (error) return { error: '저장에 실패했습니다' }

  revalidatePath('/expense')
  revalidatePath('/week')
  return { error: null }
}

export async function addPaymentMethod(
  name: string,
  type: 'card' | 'account' | 'cash' | 'investment',
  color?: string,
): Promise<EntryResult & { id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const trimmed = name.trim()
  if (!trimmed) return { error: '지갑 이름을 입력해주세요' }

  const payload: Record<string, unknown> = { user_id: user.id, name: trimmed, type }
  if (color) payload.color = color

  let { data, error } = await supabase
    .from('payment_method')
    .insert(payload)
    .select('id')
    .single()

  if (error && type === 'investment') {
    const fallback = await supabase
      .from('payment_method')
      .insert({ ...payload, type: 'account' })
      .select('id')
      .single()
    data = fallback.data
    error = fallback.error
  }

  if (error) return { error: '저장에 실패했습니다' }

  revalidatePath('/expense')
  return { error: null, id: data?.id }
}

export async function deletePaymentMethod(id: string): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }
  const { error } = await supabase.from('payment_method').delete().eq('id', id).eq('user_id', user.id)
  if (error) return { error: '삭제에 실패했습니다' }
  revalidatePath('/expense')
  return { error: null }
}

export async function updatePaymentMethodColor(id: string, color: string): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }
  const { error } = await supabase.from('payment_method').update({ color }).eq('id', id).eq('user_id', user.id)
  if (error) return { error: '저장에 실패했습니다' }
  revalidatePath('/expense')
  return { error: null }
}

export async function addMemo(formData: FormData): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const text = (formData.get('text') as string)?.trim()
  const date = formData.get('date') as string
  if (!text || !date) return { error: '내용을 입력해주세요' }

  const { error } = await supabase.from('memo_card').insert({ user_id: user.id, text, date })
  if (error) return { error: '저장에 실패했습니다' }

  revalidatePath('/memo')
  revalidatePath('/week')
  return { error: null }
}

export async function updateMemo(id: string, formData: FormData): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const text = (formData.get('text') as string)?.trim()
  const date = formData.get('date') as string
  if (!text || !date) return { error: '내용을 입력해주세요' }

  const { error } = await supabase
    .from('memo_card')
    .update({ text, date })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: '수정에 실패했습니다' }

  revalidatePath('/memo')
  revalidatePath('/week')
  return { error: null }
}

export async function deleteMemo(id: string): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const { error } = await supabase
    .from('memo_card')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: '삭제에 실패했습니다' }

  revalidatePath('/memo')
  revalidatePath('/week')
  return { error: null }
}

export async function updateNickname(nickname: string): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }
  const trimmed = nickname.trim()
  if (!trimmed) return { error: '닉네임을 입력해주세요' }
  const { error } = await supabase.from('users').update({ nickname: trimmed }).eq('id', user.id)
  if (error) return { error: '저장에 실패했습니다' }
  revalidatePath('/', 'layout')
  return { error: null }
}

export async function updateDiaryName(diaryName: string): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const trimmed = diaryName.trim()
  if (!trimmed) return { error: '다이어리 이름을 입력해주세요' }

  const { error } = await supabase.from('users').update({ diary_name: trimmed }).eq('id', user.id)
  if (error) return { error: '저장에 실패했습니다' }

  revalidatePath('/week')
  return { error: null }
}

export async function updateAvatarUrl(url: string): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const { error } = await supabase.from('users').update({ avatar_url: url }).eq('id', user.id)
  if (error) return { error: '저장에 실패했습니다' }

  revalidatePath('/week')
  return { error: null }
}

export type MoodLevel = 'good' | 'calm' | 'tired' | 'sad'

export async function saveMood(date: string, mood: MoodLevel): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const { error } = await supabase
    .from('mood_check')
    .upsert({ user_id: user.id, date, mood }, { onConflict: 'user_id,date' })
  if (error) return { error: '저장에 실패했습니다' }

  revalidatePath('/habit')
  return { error: null }
}

export async function addFocusItem(formData: FormData): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const text = (formData.get('text') as string)?.trim()
  const date = formData.get('date') as string
  if (!text || !date) return { error: '내용을 입력해 주세요' }

  const { error } = await supabase
    .from('focus_item')
    .insert({ user_id: user.id, date, text })
  if (error) return { error: error.message || '저장에 실패했습니다' }

  revalidatePath('/habit')
  revalidatePath('/week')
  return { error: null }
}

export async function updateFocusItem(id: string, text: string): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const trimmed = text.trim()
  if (!trimmed) return { error: '내용을 입력해 주세요' }

  const { error } = await supabase
    .from('focus_item')
    .update({ text: trimmed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message || '수정에 실패했습니다' }

  revalidatePath('/habit')
  revalidatePath('/week')
  return { error: null }
}

export async function toggleFocusItem(id: string, isDone: boolean): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const { error } = await supabase
    .from('focus_item')
    .update({ is_done: isDone, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message || '저장에 실패했습니다' }

  revalidatePath('/habit')
  revalidatePath('/week')
  return { error: null }
}

export async function deleteFocusItem(id: string): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const { error } = await supabase
    .from('focus_item')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message || '삭제에 실패했습니다' }

  revalidatePath('/habit')
  revalidatePath('/week')
  return { error: null }
}

export async function toggleScheduleDone(scheduleId: string, isDone: boolean): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const { error } = await supabase
    .from('schedule')
    .update({ is_done: isDone })
    .eq('id', scheduleId)
    .eq('user_id', user.id)
  if (error) return { error: '저장에 실패했습니다' }

  revalidatePath('/schedule')
  revalidatePath('/week')
  return { error: null }
}

export async function updateCalendarStartDay(startDay: 0 | 1): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const { error } = await supabase.from('users').update({ calendar_start_day: startDay }).eq('id', user.id)
  if (error) return { error: '저장에 실패했습니다' }

  revalidatePath('/', 'layout')
  return { error: null }
}

export async function updateBoardSettings(
  theme: 'white' | 'beige' | 'pastel-pink' | 'black',
  font: 'gothic' | 'memoment' | 'kyobo',
  startDay: 0 | 1,
): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const { error } = await supabase
    .from('users')
    .update({ theme, font, calendar_start_day: startDay })
    .eq('id', user.id)
  if (error) return { error: error.message || '설정 저장에 실패했습니다' }

  revalidatePath('/', 'layout')
  return { error: null }
}

export async function resetUserRecords(): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { data: habits, error: habitLookupError } = await supabase
    .from('habit')
    .select('id')
    .eq('user_id', user.id)
  if (habitLookupError) return { error: habitLookupError.message || '습관 조회에 실패했습니다.' }

  const habitIds = (habits ?? []).map(habit => habit.id)
  const deletions: PromiseLike<{ error: { message?: string } | null }>[] = []

  if (habitIds.length > 0) {
    deletions.push(
      supabase.from('habit_check').delete().in('habit_id', habitIds),
    )
  }

  deletions.push(
    supabase.from('habit_review').delete().eq('user_id', user.id),
    supabase.from('focus_item').delete().eq('user_id', user.id),
    supabase.from('mood_check').delete().eq('user_id', user.id),
    supabase.from('schedule').delete().eq('user_id', user.id),
    supabase.from('expense').delete().eq('user_id', user.id),
    supabase.from('memo_card').delete().eq('user_id', user.id),
    supabase.from('habit').delete().eq('user_id', user.id),
  )

  const results = await Promise.all(deletions)
  const failed = results.find(result => result.error)
  if (failed?.error) return { error: failed.error.message || '기록 초기화에 실패했습니다.' }

  revalidatePath('/week')
  revalidatePath('/schedule')
  revalidatePath('/habit')
  revalidatePath('/expense')
  revalidatePath('/memo')
  return { error: null }
}

function generateCode(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase()
}

function calendarGroupError(message?: string) {
  if (!message) return '공유 캘린더 처리에 실패했습니다'
  if (message.includes('calendar_group') || message.includes('relation') || message.includes('schema cache')) {
    return '공유 캘린더 DB 마이그레이션이 필요합니다'
  }
  return message
}

export async function createCalendarGroup(name: string): Promise<EntryResult & { invite_code?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const trimmed = name.trim()
  if (!trimmed) return { error: '그룹 이름을 입력해주세요' }

  const invite_code = generateCode()

  const { data: group, error: ge } = await supabase
    .from('calendar_group')
    .insert({ name: trimmed, created_by: user.id, invite_code })
    .select('id')
    .single()
  if (ge) return { error: calendarGroupError(ge.message) || '그룹 생성에 실패했습니다' }

  const { error: me } = await supabase
    .from('calendar_group_member')
    .insert({ group_id: group.id, user_id: user.id })
  if (me) return { error: calendarGroupError(me.message) || '멤버 추가에 실패했습니다' }

  revalidatePath('/schedule')
  return { error: null, invite_code }
}

export async function joinCalendarGroup(code: string): Promise<EntryResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const { data: group, error: ge } = await supabase
    .from('calendar_group')
    .select('id')
    .eq('invite_code', code.trim().toUpperCase())
    .single()
  if (ge || !group) return { error: '유효하지 않은 초대 코드입니다' }

  const { error: me } = await supabase
    .from('calendar_group_member')
    .upsert({ group_id: group.id, user_id: user.id }, { onConflict: 'group_id,user_id' })
  if (me) return { error: calendarGroupError(me.message) || '참가에 실패했습니다' }

  revalidatePath('/schedule')
  return { error: null }
}
