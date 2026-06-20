-- Shared calendar groups
create table if not exists public.calendar_group (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  created_by  uuid references public.users(id) on delete cascade not null,
  invite_code text not null unique,
  created_at  timestamptz default now()
);

create table if not exists public.calendar_group_member (
  group_id   uuid references public.calendar_group(id) on delete cascade not null,
  user_id    uuid references public.users(id) on delete cascade not null,
  joined_at  timestamptz default now(),
  primary key (group_id, user_id)
);

alter table public.calendar_group enable row level security;
alter table public.calendar_group_member enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'calendar_group_all' and tablename = 'calendar_group') then
    create policy "calendar_group_all" on public.calendar_group
      using  (auth.uid() = created_by or auth.uid() in (select user_id from public.calendar_group_member where group_id = id))
      with check (auth.uid() = created_by);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'calendar_group_member_all' and tablename = 'calendar_group_member') then
    create policy "calendar_group_member_all" on public.calendar_group_member
      using  (auth.uid() = user_id or auth.uid() in (select user_id from public.calendar_group_member m2 where m2.group_id = group_id))
      with check (auth.uid() = user_id);
  end if;
  -- Allow group members to read shared schedules
  if not exists (select 1 from pg_policies where policyname = 'schedule_group_read' and tablename = 'schedule') then
    create policy "schedule_group_read" on public.schedule
      for select
      using (
        auth.uid() in (
          select m1.user_id from public.calendar_group_member m1
          join public.calendar_group_member m2 on m1.group_id = m2.group_id
          where m2.user_id = public.schedule.user_id
            and m1.user_id <> m2.user_id
        )
      );
  end if;
end $$;
