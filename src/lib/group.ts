import type { SupabaseClient } from '@supabase/supabase-js'

export type GroupData = {
  id: string
  name: string
  invite_code: string
  members: { user_id: string; nickname: string | null }[]
} | null

type RawMembership = {
  calendar_group: {
    id: string
    name: string
    invite_code: string
    calendar_group_member: { user_id: string; users?: { nickname?: string | null } | null }[]
  } | null
} | null

export async function fetchGroup(supabase: SupabaseClient, userId: string): Promise<GroupData> {
  const { data } = await supabase
    .from('calendar_group_member')
    .select('calendar_group(id, name, invite_code, calendar_group_member(user_id, users(nickname)))')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  const raw = data as RawMembership
  const g = raw?.calendar_group ?? null
  if (!g) return null

  return {
    id: g.id,
    name: g.name,
    invite_code: g.invite_code,
    members: (g.calendar_group_member ?? [])
      .filter(m => m.user_id !== userId)
      .map(m => ({ user_id: m.user_id, nickname: (m.users as { nickname?: string | null } | null)?.nickname ?? null })),
  }
}
