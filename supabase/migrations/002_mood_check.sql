create table if not exists public.mood_check (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references public.users(id) on delete cascade not null,
  date         date not null,
  mood         text not null check (mood in ('good', 'calm', 'tired', 'sad')),
  created_at   timestamptz default now() not null,
  unique (user_id, date)
);

alter table public.mood_check enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'mood_check_all' and tablename = 'mood_check'
  ) then
    create policy "mood_check_all" on public.mood_check
      using  (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
