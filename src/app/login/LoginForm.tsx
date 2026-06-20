'use client'

import { useState, useActionState } from 'react'
import { login, signup, type AuthState } from '@/app/actions/auth'

const initial: AuthState = { error: null }

const inputStyle: React.CSSProperties = {
  background: 'var(--bg)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 12px',
  color: 'var(--text-primary)',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
}

function AuthInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={inputStyle}
      onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    />
  )
}

export default function LoginForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loginState, loginAction, loginPending] = useActionState(login, initial)
  const [signupState, signupAction, signupPending] = useActionState(signup, initial)

  const isLogin = mode === 'login'
  const state = isLogin ? loginState : signupState
  const action = isLogin ? loginAction : signupAction
  const isPending = isLogin ? loginPending : signupPending

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ background: 'var(--bg)' }}
    >
      {/* 로고 */}
      <div className="mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="기록쌓기" style={{ height: '96px', width: 'auto' }} />
      </div>

      {/* 카드 */}
      <div
        className="w-full"
        style={{
          maxWidth: '320px',
          background: 'var(--surface)',
          borderRadius: 'var(--radius-card)',
          border: '0.5px solid var(--border)',
          padding: 'var(--card-padding)',
        }}
      >
        <form action={action} key={mode} className="flex flex-col" style={{ gap: '12px' }}>

          {/* 이메일 */}
          <div className="flex flex-col" style={{ gap: '4px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>이메일</label>
            <AuthInput name="email" type="email" required placeholder="email@example.com" />
          </div>

          {/* 닉네임 (회원가입만) */}
          {!isLogin && (
            <div className="flex flex-col" style={{ gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>닉네임</label>
              <AuthInput name="nickname" type="text" required placeholder="이름 또는 별명" />
            </div>
          )}

          {/* 비밀번호 */}
          <div className="flex flex-col" style={{ gap: '4px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              비밀번호
              {!isLogin && (
                <span style={{ marginLeft: '4px', color: 'var(--text-muted)' }}>(6자 이상)</span>
              )}
            </label>
            <AuthInput name="password" type="password" required placeholder="••••••" />
          </div>

          {/* 에러 메시지 */}
          {state?.error && (
            <p style={{ fontSize: '12px', color: '#d95f5f', margin: 0 }}>{state.error}</p>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={isPending}
            style={{
              background: 'var(--accent)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '11px 0',
              fontSize: '14px',
              fontWeight: 500,
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.6 : 1,
              marginTop: '4px',
            }}
          >
            {isPending ? '처리 중…' : isLogin ? '로그인' : '회원가입'}
          </button>
        </form>
      </div>

      {/* 모드 전환 */}
      <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
        {isLogin ? '아직 계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
        <button
          onClick={() => setMode(isLogin ? 'signup' : 'login')}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--accent)',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
          }}
        >
          {isLogin ? '회원가입' : '로그인'}
        </button>
      </div>
    </div>
  )
}
