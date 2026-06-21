'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  addCategory,
  addExpenseCategory,
  createCalendarGroup,
  deleteCategory,
  deleteExpenseCategory,
  joinCalendarGroup,
  updateAvatarUrl,
  updateBoardSettings,
  updateCategory,
  updateDiaryName,
  updateExpenseCategory,
  updateNickname,
} from '@/app/actions/entries'
import { useCalendarStartDay } from '@/context/CalendarStartDayContext'
import { boardHref, fonts, themes, type BoardFont, type BoardTheme } from '@/components/BoardShell'

type View = 'settings' | 'nickname' | 'theme' | 'category' | 'account' | 'shared'
type Group = { id: string; name: string; invite_code: string }
type Member = { user_id: string; nickname: string | null }
type Category = { id: string; name: string; color: string | null }

type Props = {
  nickname: string
  diaryName: string
  avatarUrl: string | null
  userId: string
  calendarStartDay: 0 | 1
  group: Group | null
  members: Member[]
  theme: BoardTheme
  font: BoardFont
  basePath: string
}

const SETTINGS_MENU: { key: View; label: string }[] = [
  { key: 'nickname', label: '사용자 수정' },
  { key: 'theme', label: '테마 변경' },
  { key: 'category', label: '카테고리 설정' },
  { key: 'account', label: '계정 / 로그아웃' },
  { key: 'shared', label: '공유 캘린더' },
]

const CATEGORY_COLORS = [
  '#f7b9c0',
  '#f7d6b9',
  '#f4e8a8',
  '#cfe9cb',
  '#bde5dd',
  '#b8d4e8',
  '#c9c7ee',
  '#e1c7ea',
  '#e8dcc8',
  '#d8d8d8',
]

const THEME_LABELS: Record<BoardTheme, string> = {
  white: '화이트',
  beige: '베이지',
  'pastel-pink': '파스텔핑크',
  black: '블랙',
}

const THEME_DESCRIPTIONS: Record<BoardTheme, string> = {
  white: '깔끔한 화이트 기본 테마',
  beige: '따뜻한 베이지 레몬 포인트',
  'pastel-pink': '귀여운 핑크 블루 포인트',
  black: '모던 블랙 그린 포인트',
}

const FONT_LABELS: Record<BoardFont, string> = {
  gothic: '프리텐다드 고딕',
  memoment: '메모먼트꾹꾹체',
  kyobo: '교보 손글씨',
}

const titleMap: Record<View, string> = {
  settings: '환경설정',
  nickname: '사용자 수정',
  theme: '테마 변경',
  category: '카테고리 설정',
  account: '계정',
  shared: '공유 캘린더',
}

export default function ProfileCard({
  nickname: initNickname,
  diaryName: initDiaryName,
  avatarUrl,
  userId,
  calendarStartDay,
  group,
  members,
  theme,
  font,
  basePath,
}: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('settings')
  const [avatar, setAvatar] = useState(avatarUrl)
  const [uploading, setUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const [nicknameVal, setNicknameVal] = useState(initNickname)
  const [diaryNameVal, setDiaryNameVal] = useState(initDiaryName)
  const [namePending, setNamePending] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [groupView, setGroupView] = useState<'idle' | 'create' | 'join'>('idle')
  const [groupName, setGroupName] = useState('')
  const [inviteInput, setInviteInput] = useState('')
  const [currentGroup, setCurrentGroup] = useState<Group | null>(group)
  const [groupPending, setGroupPending] = useState(false)
  const [groupError, setGroupError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [startDay, setStartDay] = useState<0 | 1>(calendarStartDay)
  const [settingPending, setSettingPending] = useState(false)
  const [settingError, setSettingError] = useState<string | null>(null)
  const [draftTheme, setDraftTheme] = useState<BoardTheme>(theme)
  const [draftFont, setDraftFont] = useState<BoardFont>(font)
  const [themeListOpen, setThemeListOpen] = useState(false)
  const [fontListOpen, setFontListOpen] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [walletCategories, setWalletCategories] = useState<Category[]>([])
  const [categoryMode, setCategoryMode] = useState<'schedule' | 'wallet'>('schedule')
  const [categoryName, setCategoryName] = useState('')
  const [categoryColor, setCategoryColor] = useState(CATEGORY_COLORS[5])
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [categoryPending, setCategoryPending] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  const { setStartDay: setCtxStartDay } = useCalendarStartDay()
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function openModal() {
    setView('settings')
    setDraftTheme(theme)
    setDraftFont(font)
    setStartDay(calendarStartDay)
    setThemeListOpen(false)
    setFontListOpen(false)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setView('settings')
    setGroupView('idle')
    setNameError(null)
    setGroupError(null)
    setSettingError(null)
  }

  useEffect(() => {
    if (view !== 'account' || email) return
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [view, email])

  useEffect(() => {
    if (view !== 'category') return
    const supabase = createClient()
    Promise.all([
      supabase.from('schedule_category').select('id, name, color').order('created_at'),
      supabase.from('expense_category').select('id, name, color').order('created_at'),
    ]).then(async ([scheduleResult, walletResult]) => {
      setCategories((scheduleResult.data ?? []) as Category[])
      if (walletResult.error) {
        const fallback = await supabase.from('expense_category').select('id, name').order('created_at')
        setWalletCategories(((fallback.data ?? []) as Category[]).map(item => ({ ...item, color: item.color ?? null })))
        return
      }
      setWalletCategories((walletResult.data ?? []) as Category[])
    })
  }, [view])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setAvatarError(null)
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/avatar.${ext}`
    const { data, error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })

    if (error) {
      setAvatarError(`사진 업로드 실패: ${error.message}`)
      setUploading(false)
      return
    }

    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(data.path)
    setAvatar(publicData.publicUrl)
    const result = await updateAvatarUrl(publicData.publicUrl)
    if (result.error) setAvatarError(`저장 실패: ${result.error}`)
    setUploading(false)
  }

  async function handleSaveNickname() {
    setNamePending(true)
    setNameError(null)
    const [nicknameResult, diaryResult] = await Promise.all([
      updateNickname(nicknameVal),
      updateDiaryName(diaryNameVal),
    ])
    const error = nicknameResult.error || diaryResult.error
    if (error) setNameError(error)
    else {
      router.refresh()
      setView('settings')
    }
    setNamePending(false)
  }

  async function handleSaveTheme() {
    setSettingPending(true)
    setSettingError(null)
    const previousStartDay = startDay
    setCtxStartDay(startDay)

    const result = await updateBoardSettings(draftTheme, draftFont, startDay)
    if (result.error) {
      setSettingError(result.error)
      setStartDay(previousStartDay)
      setCtxStartDay(previousStartDay)
      setSettingPending(false)
      return
    }

    setSettingPending(false)
    setOpen(false)
    router.push(boardHref(basePath, draftTheme, draftFont))
    router.refresh()
  }

  function resetCategoryForm() {
    setEditingCategoryId(null)
    setCategoryName('')
    setCategoryColor(CATEGORY_COLORS[5])
    setCategoryError(null)
  }

  function switchCategoryMode(mode: 'schedule' | 'wallet') {
    setCategoryMode(mode)
    resetCategoryForm()
  }

  function startEditCategory(category: Category) {
    setEditingCategoryId(category.id)
    setCategoryName(category.name)
    setCategoryColor(category.color ?? CATEGORY_COLORS[5])
    setCategoryError(null)
  }

  async function reloadCategories() {
    const supabase = createClient()
    const table = categoryMode === 'schedule' ? 'schedule_category' : 'expense_category'
    const result = await supabase.from(table).select('id, name, color').order('created_at')
    const rows = (result.data ?? []) as Category[]
    if (categoryMode === 'schedule') setCategories(rows)
    else setWalletCategories(rows)
  }

  async function handleSaveCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCategoryPending(true)
    setCategoryError(null)

    const result = editingCategoryId
      ? categoryMode === 'schedule'
        ? await updateCategory(editingCategoryId, categoryName, categoryColor)
        : await updateExpenseCategory(editingCategoryId, categoryName, categoryColor)
      : categoryMode === 'schedule'
        ? await addCategory(categoryName, categoryColor)
        : await addExpenseCategory(categoryName, categoryColor)

    if (result.error) setCategoryError(result.error)
    else {
      await reloadCategories()
      resetCategoryForm()
    }
    setCategoryPending(false)
  }

  async function handleDeleteCategory(id: string) {
    setCategoryPending(true)
    setCategoryError(null)
    const result = categoryMode === 'schedule' ? await deleteCategory(id) : await deleteExpenseCategory(id)
    if (result.error) setCategoryError(result.error)
    else {
      if (categoryMode === 'schedule') setCategories(prev => prev.filter(category => category.id !== id))
      else setWalletCategories(prev => prev.filter(category => category.id !== id))
      if (editingCategoryId === id) resetCategoryForm()
    }
    setCategoryPending(false)
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    setGroupPending(true)
    setGroupError(null)
    const result = await createCalendarGroup(groupName.trim())
    if (result.error) setGroupError(result.error)
    else {
      setCurrentGroup({ id: '', name: groupName.trim(), invite_code: result.invite_code! })
      setGroupName('')
      setGroupView('idle')
      router.refresh()
    }
    setGroupPending(false)
  }

  async function handleJoinGroup(e: React.FormEvent) {
    e.preventDefault()
    setGroupPending(true)
    setGroupError(null)
    const result = await joinCalendarGroup(inviteInput)
    if (result.error) setGroupError(result.error)
    else {
      setInviteInput('')
      setGroupView('idle')
      router.refresh()
    }
    setGroupPending(false)
  }

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const activeCategories = categoryMode === 'schedule' ? categories : walletCategories

  return (
    <>
      <button
        type="button"
        className="board-v2-profile board-v2-top-card board-v2-profile-open"
        onClick={openModal}
        aria-label="프로필 열기"
      >
        <div
          className={`board-v2-avatar${uploading ? ' is-uploading' : ''}${avatar ? ' has-image' : ''}`}
          style={avatar ? { backgroundImage: `url(${avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        />
        <strong>{nicknameVal}</strong>
        <span className="board-v2-diary-name-static">{diaryNameVal}</span>
      </button>

      {open && (
        <div className="board-v2-profile-overlay" onClick={close}>
          <div className="board-v2-profile-modal" onClick={e => e.stopPropagation()}>
            <div className="board-v2-profile-modal-hd">
              {view !== 'settings' ? (
                <button type="button" className="board-v2-profile-back" onClick={() => setView('settings')}>‹</button>
              ) : (
                <span />
              )}
              <span className="board-v2-profile-modal-title">{titleMap[view]}</span>
              <button type="button" className="board-v2-profile-close" onClick={close}>×</button>
            </div>

            {view === 'settings' && (
              <ul className="board-v2-profile-menu">
                {SETTINGS_MENU.map(item => (
                  <li key={item.key}>
                    <button type="button" className="board-v2-profile-menu-item" onClick={() => setView(item.key)}>
                      <span>{item.label}</span>
                      <span className="board-v2-profile-chevron">›</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {view === 'nickname' && (
              <div className="board-v2-profile-form">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
                <div className="board-v2-profile-main-avatar-wrap">
                  <div
                    className={`board-v2-profile-main-avatar${avatar ? ' has-image' : ''}${uploading ? ' is-uploading' : ''}`}
                    style={avatar ? { backgroundImage: `url(${avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                  />
                  <button
                    type="button"
                    className="board-v2-profile-photo-btn"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? '업로드 중' : '사진 변경'}
                  </button>
                  {avatarError && <p className="board-v2-cal-error">{avatarError}</p>}
                </div>
                <label className="board-v2-profile-field-label">닉네임</label>
                <input className="board-v2-profile-input" value={nicknameVal} onChange={e => setNicknameVal(e.target.value)} maxLength={20} />
                <label className="board-v2-profile-field-label">다이어리 이름</label>
                <input className="board-v2-profile-input" value={diaryNameVal} onChange={e => setDiaryNameVal(e.target.value)} maxLength={20} />
                {nameError && <p className="board-v2-cal-error">{nameError}</p>}
                <button type="button" className="board-v2-profile-save-btn" disabled={namePending} onClick={handleSaveNickname}>
                  {namePending ? '저장 중' : '저장'}
                </button>
              </div>
            )}

            {view === 'theme' && (
              <div className="board-v2-profile-form">
                <label className="board-v2-profile-field-label">테마</label>
                <div className="board-v2-setting-dropdown">
                  <button
                    type="button"
                    className="board-v2-setting-trigger"
                    data-theme-choice={draftTheme}
                    onClick={() => setThemeListOpen(value => !value)}
                    aria-expanded={themeListOpen}
                  >
                    <span>
                      <strong>{THEME_LABELS[draftTheme]}</strong>
                      <small>{THEME_DESCRIPTIONS[draftTheme]}</small>
                    </span>
                    <b>⌄</b>
                  </button>
                  {themeListOpen && (
                    <div className="board-v2-setting-options">
                      {themes.map(item => (
                        <button
                          key={item}
                          type="button"
                          className={draftTheme === item ? 'is-active' : ''}
                          data-theme-choice={item}
                          onClick={() => {
                            setDraftTheme(item)
                            setThemeListOpen(false)
                          }}
                        >
                          <span>
                            <strong>{THEME_LABELS[item]}</strong>
                            <small>{THEME_DESCRIPTIONS[item]}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <label className="board-v2-profile-field-label">글꼴</label>
                <div className="board-v2-setting-dropdown">
                  <button
                    type="button"
                    className="board-v2-setting-trigger"
                    data-font-choice={draftFont}
                    onClick={() => setFontListOpen(value => !value)}
                    aria-expanded={fontListOpen}
                  >
                    <span>
                      <strong>{FONT_LABELS[draftFont]}</strong>
                    </span>
                    <b>⌄</b>
                  </button>
                  {fontListOpen && (
                    <div className="board-v2-setting-options">
                      {fonts.map(item => (
                        <button
                          key={item}
                          type="button"
                          className={draftFont === item ? 'is-active' : ''}
                          data-font-choice={item}
                          onClick={() => {
                            setDraftFont(item)
                            setFontListOpen(false)
                          }}
                        >
                          <span className={`board-v2-font-sample board-v2-font-${item}`}>
                            <strong>{FONT_LABELS[item]}</strong>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <label className="board-v2-profile-field-label">캘린더 시작 요일</label>
                <div className="board-v2-ampm-toggle board-v2-startday-toggle">
                  <button type="button" className={`board-v2-ampm-btn${startDay === 1 ? ' is-active' : ''}`} onClick={() => setStartDay(1)}>
                    월요일
                  </button>
                  <button type="button" className={`board-v2-ampm-btn${startDay === 0 ? ' is-active' : ''}`} onClick={() => setStartDay(0)}>
                    일요일
                  </button>
                </div>
                {settingError && <p className="board-v2-cal-error">{settingError}</p>}
                <button type="button" className="board-v2-profile-save-btn" disabled={settingPending} onClick={handleSaveTheme}>
                  {settingPending ? '저장 중' : '저장'}
                </button>
              </div>
            )}

            {view === 'category' && (
              <div className="board-v2-profile-form">
                <div className="board-v2-category-mode">
                  <button type="button" className={categoryMode === 'schedule' ? 'is-active' : ''} onClick={() => switchCategoryMode('schedule')}>
                    일정 카테고리
                  </button>
                  <button type="button" className={categoryMode === 'wallet' ? 'is-active' : ''} onClick={() => switchCategoryMode('wallet')}>
                    지갑 카테고리
                  </button>
                </div>
                <form onSubmit={handleSaveCategory} className="board-v2-category-manager-form">
                  <label className="board-v2-profile-field-label">{categoryMode === 'schedule' ? '일정 카테고리' : '지갑 카테고리'}</label>
                  <input
                    className="board-v2-profile-input"
                    value={categoryName}
                    onChange={e => setCategoryName(e.target.value)}
                    placeholder="예: 공유 일정, 식비, 데이트"
                    maxLength={16}
                    required
                  />
                  <div className="board-v2-category-color-grid">
                    {CATEGORY_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={categoryColor === color ? 'is-active' : ''}
                        style={{ background: color }}
                        onClick={() => setCategoryColor(color)}
                        aria-label={`색상 ${color}`}
                      />
                    ))}
                  </div>
                  {categoryError && <p className="board-v2-cal-error">{categoryError}</p>}
                  <button type="submit" className="board-v2-profile-save-btn" disabled={categoryPending}>
                    {categoryPending ? '저장 중' : editingCategoryId ? '수정 저장' : '카테고리 추가'}
                  </button>
                  {editingCategoryId && (
                    <button type="button" className="board-v2-category-reset-btn" onClick={resetCategoryForm}>
                      새 카테고리 입력
                    </button>
                  )}
                </form>
                <div className="board-v2-category-list">
                  {activeCategories.length > 0 ? (
                    activeCategories.map(category => (
                      <div key={category.id} className="board-v2-category-item">
                        <button type="button" onClick={() => startEditCategory(category)}>
                          <span style={{ background: category.color ?? '#ffffff' }} />
                          <strong>{category.name}</strong>
                        </button>
                        <button type="button" className="board-v2-category-delete" disabled={categoryPending} onClick={() => handleDeleteCategory(category.id)}>
                          삭제
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="board-v2-category-empty">아직 카테고리가 없어요.</p>
                  )}
                </div>
              </div>
            )}

            {view === 'account' && (
              <div className="board-v2-profile-form">
                <label className="board-v2-profile-field-label">이메일</label>
                <div className="board-v2-profile-email">{email || '-'}</div>
                <button type="button" className="board-v2-profile-logout-btn" onClick={handleLogout}>
                  로그아웃
                </button>
              </div>
            )}

            {view === 'shared' && (
              <div className="board-v2-profile-form">
                {currentGroup ? (
                  <div className="board-v2-settings-group">
                    <div className="board-v2-settings-group-name">{currentGroup.name}</div>
                    <button type="button" className="board-v2-shared-code" onClick={() => copyCode(currentGroup.invite_code)}>
                      {copied ? '복사했어요' : `초대 코드: ${currentGroup.invite_code}`}
                    </button>
                    {members.length > 0 && (
                      <div className="board-v2-shared-members">
                        {members.map(member => (
                          <span key={member.user_id} className="board-v2-shared-member">
                            {member.nickname ?? '사용자'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : groupView === 'idle' ? (
                  <div className="board-v2-shared-actions">
                    <button type="button" className="board-v2-shared-btn" onClick={() => setGroupView('create')}>
                      그룹 만들기
                    </button>
                    <button type="button" className="board-v2-shared-btn" onClick={() => setGroupView('join')}>
                      코드로 참가
                    </button>
                  </div>
                ) : groupView === 'create' ? (
                  <form onSubmit={handleCreateGroup} className="board-v2-shared-form">
                    <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="그룹 이름" className="board-v2-cal-input" required />
                    {groupError && <p className="board-v2-cal-error">{groupError}</p>}
                    <div className="board-v2-cal-actions">
                      <button type="button" className="board-v2-cal-cancel" onClick={() => setGroupView('idle')}>취소</button>
                      <button type="submit" disabled={groupPending} className="board-v2-cal-submit">{groupPending ? '처리 중' : '만들기'}</button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleJoinGroup} className="board-v2-shared-form">
                    <input
                      value={inviteInput}
                      onChange={e => setInviteInput(e.target.value.toUpperCase())}
                      placeholder="초대 코드 8자리"
                      className="board-v2-cal-input"
                      maxLength={8}
                      required
                    />
                    {groupError && <p className="board-v2-cal-error">{groupError}</p>}
                    <div className="board-v2-cal-actions">
                      <button type="button" className="board-v2-cal-cancel" onClick={() => setGroupView('idle')}>취소</button>
                      <button type="submit" disabled={groupPending} className="board-v2-cal-submit">{groupPending ? '처리 중' : '참가'}</button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
