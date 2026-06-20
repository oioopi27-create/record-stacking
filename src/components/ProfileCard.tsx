'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  updateNickname,
  updateDiaryName,
  updateAvatarUrl,
  updateCalendarStartDay,
  createCalendarGroup,
  joinCalendarGroup,
} from '@/app/actions/entries'
import { useCalendarStartDay } from '@/context/CalendarStartDayContext'

type View   = 'main' | 'settings' | 'nickname' | 'account' | 'shared' | 'startday'
type Group  = { id: string; name: string; invite_code: string }
type Member = { user_id: string; nickname: string | null }

type Props = {
  nickname: string
  diaryName: string
  avatarUrl: string | null
  userId: string
  calendarStartDay: 0 | 1
  group: Group | null
  members: Member[]
}

const SETTINGS_MENU = [
  { key: 'nickname' as View,  label: '닉네임 바꾸기' },
  { key: 'account'  as View,  label: '계정 / 로그아웃' },
  { key: 'shared'   as View,  label: '공유 캘린더' },
  { key: 'startday' as View,  label: '캘린더 시작 요일' },
]

export default function ProfileCard({
  nickname: initNickname, diaryName: initDiaryName, avatarUrl, userId,
  calendarStartDay, group, members,
}: Props) {
  const [open, setOpen]             = useState(false)
  const [view, setView]             = useState<View>('main')
  const [avatar, setAvatar]         = useState(avatarUrl)
  const [uploading, setUploading]   = useState(false)

  // nickname sub-view
  const [nicknameVal, setNicknameVal]   = useState(initNickname)
  const [diaryNameVal, setDiaryNameVal] = useState(initDiaryName)
  const [namePending, setNamePending]   = useState(false)
  const [nameError,   setNameError]     = useState<string | null>(null)

  // account sub-view
  const [email, setEmail]           = useState('')

  // shared sub-view
  const [groupView, setGroupView]   = useState<'idle' | 'create' | 'join'>('idle')
  const [groupName, setGroupName]   = useState('')
  const [inviteInput, setInviteInput] = useState('')
  const [currentGroup, setCurrentGroup] = useState<Group | null>(group)
  const [groupPending, setGroupPending] = useState(false)
  const [groupError,   setGroupError]   = useState<string | null>(null)
  const [copied,       setCopied]       = useState(false)

  // start day sub-view
  const [startDay, setStartDay]     = useState<0 | 1>(calendarStartDay)
  const [dayPending, setDayPending] = useState(false)
  const [dayError,  setDayError]    = useState<string | null>(null)

  const { setStartDay: setCtxStartDay } = useCalendarStartDay()
  const fileRef = useRef<HTMLInputElement>(null)
  const router  = useRouter()

  function openModal() {
    setView('main')
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setView('main')
    setGroupView('idle')
    setNameError(null)
    setGroupError(null)
  }

  function back() {
    if (view === 'settings') { setView('main');    return }
    if (view !== 'main')     { setView('settings'); return }
  }

  // Fetch email lazily when account view opens
  useEffect(() => {
    if (view !== 'account' || email) return
    createClient().auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
    })
  }, [view, email])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const supabase = createClient()
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/avatar.${ext}`
    const { data, error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) { setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(data.path)
    setAvatar(publicUrl)
    await updateAvatarUrl(publicUrl)
    setUploading(false)
  }

  async function handleSaveNickname() {
    setNamePending(true); setNameError(null)
    const [r1, r2] = await Promise.all([
      updateNickname(nicknameVal),
      updateDiaryName(diaryNameVal),
    ])
    const err = r1.error || r2.error
    if (err) { setNameError(err) }
    else { router.refresh(); setView('settings') }
    setNamePending(false)
  }

  async function handleStartDay(day: 0 | 1) {
    if (day === startDay || dayPending) return
    const prev = startDay
    setDayPending(true)
    setDayError(null)
    setStartDay(day)
    setCtxStartDay(day)   // 사이드바 CalendarGrid 즉시 반영
    const res = await updateCalendarStartDay(day)
    if (res.error) {
      setDayError(res.error)
      setStartDay(prev)
      setCtxStartDay(prev)
      setDayPending(false)
    } else {
      setDayPending(false)
    }
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    setGroupPending(true); setGroupError(null)
    const res = await createCalendarGroup(groupName.trim())
    if (res.error) { setGroupError(res.error) }
    else {
      setCurrentGroup({ id: '', name: groupName.trim(), invite_code: res.invite_code! })
      setGroupName(''); setGroupView('idle')
      router.refresh()
    }
    setGroupPending(false)
  }

  async function handleJoinGroup(e: React.FormEvent) {
    e.preventDefault()
    setGroupPending(true); setGroupError(null)
    const res = await joinCalendarGroup(inviteInput)
    if (res.error) { setGroupError(res.error) }
    else { setInviteInput(''); setGroupView('idle'); router.refresh() }
    setGroupPending(false)
  }

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    })
  }

  const titleMap: Partial<Record<View, string>> = {
    settings: '환경설정',
    nickname: '닉네임 바꾸기',
    account:  '계정',
    shared:   '공유 캘린더',
    startday: '캘린더 시작 요일',
  }

  return (
    <>
      {/* ── Profile card in sidebar ── */}
      <button
        type="button"
        className="board-v2-profile board-v2-top-card board-v2-profile-open"
        onClick={openModal}
        aria-label="프로필 열기"
      >
        <div
          className={`board-v2-avatar${uploading ? ' is-uploading' : ''}${avatar ? ' has-image' : ''}`}
          style={avatar ? {
            backgroundImage: `url(${avatar})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined}
        />
        <strong>{nicknameVal}</strong>
        <span className="board-v2-diary-name-static">{diaryNameVal}</span>
      </button>

      {/* ── Modal ── */}
      {open && (
        <div className="board-v2-profile-overlay" onClick={close}>
          <div className="board-v2-profile-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="board-v2-profile-modal-hd">
              {view !== 'main' ? (
                <button type="button" className="board-v2-profile-back" onClick={back}>←</button>
              ) : (
                <span />
              )}
              <span className="board-v2-profile-modal-title">
                {view === 'main' ? '' : titleMap[view]}
              </span>
              <button type="button" className="board-v2-profile-close" onClick={close}>✕</button>
            </div>

            {/* ── VIEW: main ── */}
            {view === 'main' && (
              <div className="board-v2-profile-main">
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                <div className="board-v2-profile-main-avatar-wrap">
                  <div
                    className={`board-v2-profile-main-avatar${avatar ? ' has-image' : ''}${uploading ? ' is-uploading' : ''}`}
                    style={avatar ? {
                      backgroundImage: `url(${avatar})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    } : undefined}
                  />
                  <button
                    type="button"
                    className="board-v2-profile-photo-btn"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? '업로드 중…' : '사진 변경'}
                  </button>
                </div>
                <strong className="board-v2-profile-modal-name">{nicknameVal}</strong>
                <span className="board-v2-profile-modal-diary">{diaryNameVal}</span>
                <button
                  type="button"
                  className="board-v2-profile-settings-row"
                  onClick={() => setView('settings')}
                >
                  <span>환경설정</span>
                  <span className="board-v2-profile-chevron">›</span>
                </button>
              </div>
            )}

            {/* ── VIEW: settings list ── */}
            {view === 'settings' && (
              <ul className="board-v2-profile-menu">
                {SETTINGS_MENU.map(item => (
                  <li key={item.key}>
                    <button
                      type="button"
                      className="board-v2-profile-menu-item"
                      onClick={() => setView(item.key)}
                    >
                      <span>{item.label}</span>
                      <span className="board-v2-profile-chevron">›</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* ── VIEW: nickname ── */}
            {view === 'nickname' && (
              <div className="board-v2-profile-form">
                <label className="board-v2-profile-field-label">닉네임</label>
                <input
                  className="board-v2-profile-input"
                  value={nicknameVal}
                  onChange={e => setNicknameVal(e.target.value)}
                  maxLength={20}
                  autoFocus
                />
                <label className="board-v2-profile-field-label">다이어리 이름</label>
                <input
                  className="board-v2-profile-input"
                  value={diaryNameVal}
                  onChange={e => setDiaryNameVal(e.target.value)}
                  maxLength={20}
                />
                {nameError && <p className="board-v2-cal-error">{nameError}</p>}
                <button
                  type="button"
                  className="board-v2-profile-save-btn"
                  disabled={namePending}
                  onClick={handleSaveNickname}
                >
                  {namePending ? '저장 중…' : '저장'}
                </button>
              </div>
            )}

            {/* ── VIEW: account ── */}
            {view === 'account' && (
              <div className="board-v2-profile-form">
                <label className="board-v2-profile-field-label">이메일</label>
                <div className="board-v2-profile-email">{email || '…'}</div>
                <label className="board-v2-profile-field-label">계정 ID</label>
                <div className="board-v2-profile-email board-v2-profile-uid">{userId.slice(0, 8)}…</div>
                <button
                  type="button"
                  className="board-v2-profile-logout-btn"
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </div>
            )}

            {/* ── VIEW: shared calendar ── */}
            {view === 'shared' && (
              <div className="board-v2-profile-form">
                {currentGroup ? (
                  <div className="board-v2-settings-group">
                    <div className="board-v2-settings-group-name">🔗 {currentGroup.name}</div>
                    <button
                      type="button"
                      className="board-v2-shared-code"
                      onClick={() => copyCode(currentGroup.invite_code)}
                    >
                      {copied ? '복사됨 ✓' : `초대 코드: ${currentGroup.invite_code}`}
                    </button>
                    {members.length > 0 && (
                      <div className="board-v2-shared-members" style={{ marginTop: 8 }}>
                        {members.map(m => (
                          <span key={m.user_id} className="board-v2-shared-member">
                            {m.nickname ?? '사용자'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : groupView === 'idle' ? (
                  <div className="board-v2-shared-actions">
                    <button type="button" className="board-v2-shared-btn" onClick={() => { setGroupView('create'); setGroupError(null) }}>
                      그룹 만들기
                    </button>
                    <button type="button" className="board-v2-shared-btn" onClick={() => { setGroupView('join'); setGroupError(null) }}>
                      코드로 참가
                    </button>
                  </div>
                ) : groupView === 'create' ? (
                  <form onSubmit={handleCreateGroup} className="board-v2-shared-form">
                    <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="그룹 이름" className="board-v2-cal-input" required autoFocus />
                    {groupError && <p className="board-v2-cal-error">{groupError}</p>}
                    <div className="board-v2-cal-actions">
                      <button type="button" className="board-v2-cal-cancel" onClick={() => setGroupView('idle')}>취소</button>
                      <button type="submit" disabled={groupPending} className="board-v2-cal-submit">{groupPending ? '…' : '만들기'}</button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleJoinGroup} className="board-v2-shared-form">
                    <input value={inviteInput} onChange={e => setInviteInput(e.target.value.toUpperCase())} placeholder="초대 코드 8자리" className="board-v2-cal-input" maxLength={8} required autoFocus />
                    {groupError && <p className="board-v2-cal-error">{groupError}</p>}
                    <div className="board-v2-cal-actions">
                      <button type="button" className="board-v2-cal-cancel" onClick={() => setGroupView('idle')}>취소</button>
                      <button type="submit" disabled={groupPending} className="board-v2-cal-submit">{groupPending ? '…' : '참가'}</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ── VIEW: start day ── */}
            {view === 'startday' && (
              <div className="board-v2-profile-form">
                <p className="board-v2-profile-field-label">주의 시작 요일을 선택하세요</p>
                <div className="board-v2-ampm-toggle board-v2-startday-toggle">
                  <button
                    type="button"
                    className={`board-v2-ampm-btn${startDay === 1 ? ' is-active' : ''}`}
                    disabled={dayPending}
                    onClick={() => handleStartDay(1)}
                  >월요일</button>
                  <button
                    type="button"
                    className={`board-v2-ampm-btn${startDay === 0 ? ' is-active' : ''}`}
                    disabled={dayPending}
                    onClick={() => handleStartDay(0)}
                  >일요일</button>
                </div>
                {dayError && (
                  <p className="board-v2-cal-error" style={{ textAlign: 'center', fontSize: 11 }}>{dayError}</p>
                )}
                <p className="board-v2-profile-hint">
                  {startDay === 1 ? '현재: 월요일 시작 (월·화·수·목·금·토·일)' : '현재: 일요일 시작 (일·월·화·수·목·금·토)'}
                </p>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  )
}
