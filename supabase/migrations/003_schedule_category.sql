-- Schedule category table
create table if not exists public.schedule_category (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.users(id) on delete cascade not null,
  name       text not null,
  color      text not null default '#a3d4ff',
  created_at timestamptz default now() not null
);

alter table public.schedule_category enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'schedule_category_all' and tablename = 'schedule_category'
  ) then
    create policy "schedule_category_all" on public.schedule_category
      using  (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Add color and category to schedule
alter table public.schedule add column if not exists color      text;
alter table public.schedule add column if not exists category_id uuid references public.schedule_category(id) on delete set null;
