// 사용자
export type User = {
  id: string
  email: string
  nickname: string
  theme: string
  font: string
  created_at: string
}

// 일정 (할일 통합)
export type Schedule = {
  id: string
  user_id: string
  group_id: string | null
  title: string
  date: string
  time: string | null
  use_check: boolean
  is_done: boolean
  is_shared: boolean
  color: string | null
  category_id: string | null
  is_starred: boolean
  sort_order: number
  created_at: string
}

// 반복 일정
export type RecurringSchedule = {
  id: string
  user_id: string
  title: string
  repeat_type: 'weekly' | 'monthly' | 'yearly'
  repeat_value: string
  time: string | null
  is_active: boolean
  created_at: string
}

// 디데이
export type Dday = {
  id: string
  user_id: string
  group_id: string | null
  title: string
  base_date: string
  display_type: 'count_up' | 'count_down'
  color: string | null
  created_at: string
}

// 공유 그룹
export type Group = {
  id: string
  name: string
  invite_code: string
  created_by: string
  created_at: string
}

// 습관 항목
export type Habit = {
  id: string
  user_id: string
  name: string
  color: string | null
  sort_order: number
  created_at: string
}

// 습관 체크 기록
export type HabitCheck = {
  id: string
  habit_id: string
  date: string
  is_checked: boolean
}

// 지출
export type Expense = {
  id: string
  user_id: string
  title: string
  amount: number
  date: string
  category_id: string | null
  payment_method_id: string | null
  recurring_expense_id: string | null
  created_at: string
}

// 반복 지출 (고정비)
export type RecurringExpense = {
  id: string
  user_id: string
  title: string
  amount: number
  billing_day: number
  category_id: string | null
  payment_method_id: string | null
  is_active: boolean
  created_at: string
}

// 지출 카테고리
export type ExpenseCategory = {
  id: string
  user_id: string
  name: string
  sort_order: number
}

// 일정 카테고리
export type Category = {
  id: string
  user_id: string
  name: string
  sort_order: number
}

// 결제수단
export type PaymentMethod = {
  id: string
  user_id: string
  name: string
  type: 'card' | 'account' | 'cash'
  color: string | null
  sort_order: number
}

// 색상 팔레트
export type Palette = {
  id: string
  user_id: string | null
  name: string
  hex: string
  is_default: boolean
}

// 대시보드 슬롯
export type DashboardSlot = {
  id: string
  user_id: string
  slot_number: number
  widget_type: 'dday' | 'monthly_expense' | 'habit_rate' | 'memo'
  ref_id: string | null
}

// 메모
export type MemoCard = {
  id: string
  user_id: string
  date: string
  text: string | null
  image_url: string | null
  color: string | null
  created_at: string
}

// 테마 설정
export type Theme = {
  id: string
  user_id: string
  theme_preset: 'modern-white' | 'wood-beige' | 'dark' | 'pastel-cute'
  font: 'pretendard' | 'pak-dahyeon' | 'kyobo-yubin'
}
