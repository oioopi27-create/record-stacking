'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ScheduleActionResult = {
  error: string | null
  schedule?: {
    id: string
    title: string
    date: string
    time: string | null
    time_end?: string | null
    color: string | null
    is_done: boolean
    user_id: string
    category_id?: string | null
  }
}

const SELECT_COLUMNS = 'id, title, date, time, time_end, color, is_done, user_id, category_id'

function shouldRetryWithoutOptionalFields(message: string) {
  const lower = message.toLowerCase()
  return [
    'color',
    'time_end',
    'category_id',
    'foreign key',
    'schema cache',
    'column',
  ].some(fragment => lower.includes(fragment))
}

export async function addSchedule(formData: FormData): Promise<ScheduleActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const title = (formData.get('title') as string)?.trim()
  const date = formData.get('date') as string
  const time = (formData.get('time') as string) || null
  const timeEnd = (formData.get('time_end') as string) || null
  const color = (formData.get('color') as string) || null
  const categoryId = (formData.get('category_id') as string) || null

  if (!title || !date) return { error: '일정 이름과 날짜를 입력해 주세요.' }

  const payload: Record<string, unknown> = { user_id: user.id, title, date }
  if (time) payload.time = time
  if (timeEnd) payload.time_end = timeEnd
  if (color) payload.color = color
  if (categoryId) payload.category_id = categoryId

  let { data, error } = await supabase
    .from('schedule')
    .insert(payload)
    .select(SELECT_COLUMNS)
    .single()

  if (error && shouldRetryWithoutOptionalFields(error.message)) {
    const fallbackPayload: Record<string, unknown> = { user_id: user.id, title, date }
    if (time) fallbackPayload.time = time

    const fallback = await supabase
      .from('schedule')
      .insert(fallbackPayload)
      .select(SELECT_COLUMNS)
      .single()

    data = fallback.data
    error = fallback.error
  }

  if (error || !data) {
    return { error: error?.message || '일정 저장에 실패했습니다.' }
  }

  revalidatePath('/week')
  revalidatePath('/schedule')
  return { error: null, schedule: data }
}
