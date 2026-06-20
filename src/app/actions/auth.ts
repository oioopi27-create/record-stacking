'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AuthState = { error: string | null }

export async function login(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: '이메일 또는 비밀번호를 확인해주세요.' }

  redirect('/week')
}

export async function signup(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const nickname = (formData.get('nickname') as string).trim()

  if (!nickname) return { error: '닉네임을 입력해주세요.' }
  if (password.length < 6) return { error: '비밀번호는 6자 이상이어야 합니다.' }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname } },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered') ||
        error.message.toLowerCase().includes('already exists')) {
      return { error: '이미 사용 중인 이메일입니다.' }
    }
    return { error: '회원가입 중 오류가 발생했습니다.' }
  }

  if (!data.session) return { error: '이메일 인증 링크를 확인해주세요.' }

  redirect('/week')
}
