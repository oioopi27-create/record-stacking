import { redirect } from 'next/navigation'

export default async function BoardV2Page({
  searchParams,
}: {
  searchParams?: Promise<{ theme?: string; font?: string }>
}) {
  const params = await searchParams
  const q = new URLSearchParams()
  if (params?.theme && params.theme !== 'mono') q.set('theme', params.theme)
  if (params?.font  && params.font  !== 'gothic') q.set('font',  params.font)
  const s = q.toString()
  redirect(s ? `/week?${s}` : '/week')
}
