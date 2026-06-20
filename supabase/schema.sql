-- =============================================
-- 기록쌓기 — Supabase 스키마
-- Supabase SQL Editor에 전체 복사해서 실행
-- =============================================

-- UUID 확장 활성화
create extension if not exists "uuid-ossp";


-- =====================
-- User (사용자 프로필)
-- =====================
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  nickname text not null,
  created_at timestamptz default now() not null
);


-- =====================
-- Palette (색상 팔레트) — 다른 테이블에서 참조하므로 먼저 생성
-- =====================
create table public.palette (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  hex_value text not null,
  is_default boolean default false not null,
  user_id uuid references public.users(id) on delete cascade,
  created_at timestamptz default now() not null
);

-- 기본 팔레트 10개
insert into public.palette (name, hex_value, is_default) values
  ('코랄핑크',  '#F4A8A8', true),
  ('애프리콧',  '#F4C4A0', true),
  ('레몬',      '#F4ECA0', true),
  ('올리브민트','#B4D4A0', true),
  ('민트',      '#A0D4C4', true),
  ('스카이',    '#A0C4E4', true),
  ('페리윙클',  '#A0A8E4', true),
  ('라벤더',    '#C4A0E4', true),
  ('베이지',    '#E4D4B4', true),
  ('그레이',    '#C4C4C4', true);


-- =====================
-- Group (공유 그룹)
-- =====================
create table public.groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  invite_code text unique not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now() not null
);

-- 그룹 멤버 (다대다)
create table public.group_members (
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  joined_at timestamptz default now() not null,
  primary key (group_id, user_id)
);


-- =====================
-- Category (일정 카테고리)
-- =====================
create table public.category (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now() not null
);


-- =====================
-- Schedule (일정/할일 통합)
-- =====================
create table public.schedule (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  date date not null,
  time time,
  use_check boolean default false not null,       -- 완료체크 사용여부
  is_done boolean default false not null,          -- 완료여부
  is_shared boolean default false not null,        -- 개인/공유 구분
  group_id uuid references public.groups(id) on delete set null,
  color_id uuid references public.palette(id) on delete set null,
  category_id uuid references public.category(id) on delete set null,
  is_starred boolean default false not null,       -- 중요표시
  sort_order integer default 0 not null,
  created_at timestamptz default now() not null
);


-- =====================
-- RecurringSchedule (반복 일정)
-- =====================
create table public.recurring_schedule (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  repeat_type text not null check (repeat_type in ('weekly', 'monthly', 'yearly')),
  repeat_basis jsonb not null,
  -- weekly  예: {"days": ["mon", "wed", "fri"]}
  -- monthly 예: {"day": 15}
  -- yearly  예: {"month": 3, "day": 15}
  time time,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);


-- =====================
-- Dday (디데이)
-- =====================
create table public.dday (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  title text not null,
  base_date date not null,
  display_type text default 'since' not null check (display_type in ('since', 'until')),
  -- since: "+며칠째"  /  until: "며칠 남음"
  color_id uuid references public.palette(id) on delete set null,
  created_at timestamptz default now() not null,
  check (user_id is not null or group_id is not null)
);


-- =====================
-- Habit (습관 항목 정의)
-- =====================
create table public.habit (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  color_id uuid references public.palette(id) on delete set null,
  created_at timestamptz default now() not null
);


-- =====================
-- HabitCheck (습관 체크 기록)
-- =====================
create table public.habit_check (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references public.habit(id) on delete cascade not null,
  date date not null,
  is_checked boolean default false not null,
  created_at timestamptz default now() not null,
  unique (habit_id, date)
);


-- =====================
-- ExpenseCategory (지출 카테고리)
-- =====================
create table public.expense_category (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade,
  -- user_id가 null이면 기본 제공 카테고리
  name text not null,
  created_at timestamptz default now() not null
);

-- 기본 지출 카테고리 4개
insert into public.expense_category (name) values
  ('식비'),
  ('교통비'),
  ('고정비'),
  ('꾸밈비');


-- =====================
-- PaymentMethod (결제수단)
-- =====================
create table public.payment_method (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('card', 'account', 'cash')),
  color_id uuid references public.palette(id) on delete set null,
  sort_order integer default 0 not null,
  created_at timestamptz default now() not null
);


-- =====================
-- RecurringExpense (반복 지출/고정비)
-- =====================
create table public.recurring_expense (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  amount integer not null,
  billing_day integer not null check (billing_day between 1 and 31),
  category_id uuid references public.expense_category(id) on delete set null,
  payment_method_id uuid references public.payment_method(id) on delete set null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);


-- =====================
-- Expense (지출)
-- =====================
create table public.expense (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  amount integer not null,
  date date not null,
  category_id uuid references public.expense_category(id) on delete set null,
  payment_method_id uuid references public.payment_method(id) on delete set null,
  recurring_expense_id uuid references public.recurring_expense(id) on delete set null,
  created_at timestamptz default now() not null
);


-- =====================
-- MemoCard (메모란)
-- =====================
create table public.memo_card (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null,
  text text,
  photo_url text,
  color_id uuid references public.palette(id) on delete set null,
  created_at timestamptz default now() not null
);


-- =====================
-- Theme (테마 설정)
-- =====================
create table public.theme (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null unique,
  theme_name text default 'wood_beige' not null
    check (theme_name in ('modern_white', 'wood_beige', 'dark', 'pastel_cute')),
  font_name text default 'pretendard' not null
    check (font_name in ('pretendard', 'bda_hyun', 'yoobin')),
  created_at timestamptz default now() not null
);


-- =====================
-- ProfileIcon (프로필 아이콘)
-- =====================
create table public.profile_icon (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null unique,
  icon_type text not null,
  sync_with_theme boolean default false not null,
  created_at timestamptz default now() not null
);


-- =====================
-- DashboardSlot (대시보드 슬롯 설정)
-- =====================
create table public.dashboard_slot (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  slot_number integer not null check (slot_number between 1 and 3),
  widget_type text not null
    check (widget_type in ('dday', 'monthly_expense', 'habit_rate', 'memo')),
  target_id uuid,  -- 디데이 등 연결 대상 ID
  created_at timestamptz default now() not null,
  unique (user_id, slot_number)
);


-- =============================================
-- Row Level Security (RLS)
-- =============================================
alter table public.users enable row level security;
alter table public.palette enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.category enable row level security;
alter table public.schedule enable row level security;
alter table public.recurring_schedule enable row level security;
alter table public.dday enable row level security;
alter table public.habit enable row level security;
alter table public.habit_check enable row level security;
alter table public.expense_category enable row level security;
alter table public.payment_method enable row level security;
alter table public.recurring_expense enable row level security;
alter table public.expense enable row level security;
alter table public.memo_card enable row level security;
alter table public.theme enable row level security;
alter table public.profile_icon enable row level security;
alter table public.dashboard_slot enable row level security;

-- Users
create policy "users_select" on public.users for select using (true);
create policy "users_insert" on public.users for insert with check (auth.uid() = id);
create policy "users_update" on public.users for update using (auth.uid() = id);

-- Palette: 기본(is_default=true)은 누구나, 커스텀은 본인만
create policy "palette_select" on public.palette for select
  using (is_default = true or auth.uid() = user_id);
create policy "palette_insert" on public.palette for insert
  with check (auth.uid() = user_id);
create policy "palette_update" on public.palette for update
  using (auth.uid() = user_id);
create policy "palette_delete" on public.palette for delete
  using (auth.uid() = user_id);

-- Groups: 그룹 멤버 또는 생성자만
create policy "groups_select" on public.groups for select using (
  auth.uid() = created_by or
  exists (select 1 from public.group_members where group_id = id and user_id = auth.uid())
);
create policy "groups_insert" on public.groups for insert
  with check (auth.uid() = created_by);
create policy "groups_update" on public.groups for update
  using (auth.uid() = created_by);
create policy "groups_delete" on public.groups for delete
  using (auth.uid() = created_by);

-- Group Members
create policy "group_members_select" on public.group_members for select using (
  auth.uid() = user_id or
  exists (select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid())
);
create policy "group_members_insert" on public.group_members for insert
  with check (auth.uid() = user_id);
create policy "group_members_delete" on public.group_members for delete
  using (auth.uid() = user_id);

-- Category
create policy "category_all" on public.category using (auth.uid() = user_id);

-- Schedule: 본인 + 그룹 공유 일정
create policy "schedule_select" on public.schedule for select using (
  auth.uid() = user_id or
  (is_shared = true and group_id in (
    select group_id from public.group_members where user_id = auth.uid()
  ))
);
create policy "schedule_insert" on public.schedule for insert
  with check (auth.uid() = user_id);
create policy "schedule_update" on public.schedule for update using (
  auth.uid() = user_id or
  (is_shared = true and group_id in (
    select group_id from public.group_members where user_id = auth.uid()
  ))
);
create policy "schedule_delete" on public.schedule for delete
  using (auth.uid() = user_id);

-- RecurringSchedule
create policy "recurring_schedule_all" on public.recurring_schedule
  using (auth.uid() = user_id);

-- Dday: 개인 or 그룹 멤버
create policy "dday_select" on public.dday for select using (
  auth.uid() = user_id or
  (group_id is not null and group_id in (
    select group_id from public.group_members where user_id = auth.uid()
  ))
);
create policy "dday_insert" on public.dday for insert
  with check (auth.uid() = user_id);
create policy "dday_update" on public.dday for update
  using (auth.uid() = user_id);
create policy "dday_delete" on public.dday for delete
  using (auth.uid() = user_id);

-- Habit
create policy "habit_all" on public.habit using (auth.uid() = user_id);

-- HabitCheck (본인 습관의 기록만)
create policy "habit_check_all" on public.habit_check using (
  habit_id in (select id from public.habit where user_id = auth.uid())
);

-- ExpenseCategory: 기본(user_id=null) + 본인 커스텀
create policy "expense_category_select" on public.expense_category for select
  using (user_id is null or auth.uid() = user_id);
create policy "expense_category_insert" on public.expense_category for insert
  with check (auth.uid() = user_id);
create policy "expense_category_update" on public.expense_category for update
  using (auth.uid() = user_id);
create policy "expense_category_delete" on public.expense_category for delete
  using (auth.uid() = user_id);

-- PaymentMethod
create policy "payment_method_all" on public.payment_method using (auth.uid() = user_id);

-- RecurringExpense
create policy "recurring_expense_all" on public.recurring_expense using (auth.uid() = user_id);

-- Expense
create policy "expense_all" on public.expense using (auth.uid() = user_id);

-- MemoCard
create policy "memo_card_all" on public.memo_card using (auth.uid() = user_id);

-- Theme
create policy "theme_all" on public.theme using (auth.uid() = user_id);

-- ProfileIcon
create policy "profile_icon_all" on public.profile_icon using (auth.uid() = user_id);

-- DashboardSlot
create policy "dashboard_slot_all" on public.dashboard_slot using (auth.uid() = user_id);


-- =============================================
-- 회원가입 시 자동으로 users 행 생성
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, nickname)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nickname', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
