'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type FocusItem = {
  id: string
  text: string
  is_done: boolean
}

export type FocusResult = {
  error: string | null
  item?: FocusItem
}

export async function addFocusItem(formData: FormData): Promise<FocusResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const text = (formData.get('text') as string)?.trim()
  const date = formData.get('date') as string
  if (!text || !date) return { error: '내용을 입력해 주세요.' }

  const { data, error } = await supabase
    .from('focus_item')
    .insert({ user_id: user.id, date, text })
    .select('id, text, is_done')
    .single()

  if (error) return { error: error.message || '저장에 실패했습니다.' }

  revalidatePath('/habit')
  revalidatePath('/week')
  return { error: null, item: data as FocusItem }
}

export async function updateFocusItem(id: string, text: string): Promise<FocusResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const trimmed = text.trim()
  if (!trimmed) return { error: '내용을 입력해 주세요.' }

  const { data, error } = await supabase
    .from('focus_item')
    .update({ text: trimmed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, text, is_done')
    .single()

  if (error) return { error: error.message || '수정에 실패했습니다.' }

  revalidatePath('/habit')
  revalidatePath('/week')
  return { error: null, item: data as FocusItem }
}

export async function toggleFocusItem(id: string, isDone: boolean): Promise<FocusResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { data, error } = await supabase
    .from('focus_item')
    .update({ is_done: isDone, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, text, is_done')
    .single()

  if (error) return { error: error.message || '저장에 실패했습니다.' }

  revalidatePath('/habit')
  revalidatePath('/week')
  return { error: null, item: data as FocusItem }
}

export async function deleteFocusItem(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { error } = await supabase
    .from('focus_item')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message || '삭제에 실패했습니다.' }

  revalidatePath('/habit')
  revalidatePath('/week')
  return { error: null }
}
