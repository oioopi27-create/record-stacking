-- Add avatar_url and diary_name to users table
alter table public.users
  add column if not exists avatar_url text,
  add column if not exists diary_name text not null default '기록 들이기';

-- Create avatars storage bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage RLS policies (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_public_select'
  ) then
    create policy "avatars_public_select" on storage.objects
      for select using (bucket_id = 'avatars');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_owner_insert'
  ) then
    create policy "avatars_owner_insert" on storage.objects
      for insert with check (
        bucket_id = 'avatars' and
        auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_owner_update'
  ) then
    create policy "avatars_owner_update" on storage.objects
      for update using (
        bucket_id = 'avatars' and
        auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_owner_delete'
  ) then
    create policy "avatars_owner_delete" on storage.objects
      for delete using (
        bucket_id = 'avatars' and
        auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;
