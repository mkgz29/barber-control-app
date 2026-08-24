alter table public.profiles
  add column if not exists avatar_url text;

grant update (full_name, barbershop_name, email, avatar_url) on table public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_select_authenticated" on storage.objects;
create policy "avatars_select_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own_folder" on storage.objects;
create policy "avatars_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars_update_own_folder" on storage.objects;
create policy "avatars_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars_delete_own_folder" on storage.objects;
create policy "avatars_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop function if exists public.get_barber_avatar_profiles();

create or replace function public.get_barber_avatar_profiles()
returns table (
  id uuid,
  full_name text,
  avatar_url text
)
language sql
security definer
set search_path = public
as $$
  select
    profiles.id,
    coalesce(nullif(trim(profiles.full_name), ''), 'Sin nombre') as full_name,
    profiles.avatar_url
  from public.profiles
  where auth.uid() is not null
    and profiles.is_active = true
    and profiles.role in ('admin', 'barber')
  order by full_name asc;
$$;

revoke all on function public.get_barber_avatar_profiles() from public;
revoke all on function public.get_barber_avatar_profiles() from anon;
grant execute on function public.get_barber_avatar_profiles() to authenticated;

drop function if exists public.get_global_weekly_haircuts(date);

create or replace function public.get_global_weekly_haircuts(reference_date date default current_date)
returns table (
  barber_id uuid,
  barber_name text,
  barbershop_name text,
  avatar_url text,
  total_cuts bigint
)
language sql
security definer
set search_path = public
as $$
  with business_week as (
    select
      (
        reference_date
        - (((extract(dow from reference_date)::int - 6 + 7) % 7) * interval '1 day')
      )::date as start_date
  )
  select
    profiles.id as barber_id,
    coalesce(nullif(trim(profiles.full_name), ''), 'Sin nombre') as barber_name,
    nullif(trim(profiles.barbershop_name), '') as barbershop_name,
    profiles.avatar_url,
    count(*)::bigint as total_cuts
  from public.haircuts
  join public.profiles on profiles.id = haircuts.user_id
  cross join business_week
  where profiles.is_active = true
    and exists (
      select 1
      from public.profiles admin_profile
      where admin_profile.id = auth.uid()
        and admin_profile.role = 'admin'
    )
    and haircuts.haircut_date >= business_week.start_date
    and haircuts.haircut_date < (business_week.start_date + interval '7 day')::date
  group by profiles.id, profiles.full_name, profiles.barbershop_name, profiles.avatar_url
  order by total_cuts desc, barber_name asc
  limit 5;
$$;

revoke all on function public.get_global_weekly_haircuts(date) from public;
revoke all on function public.get_global_weekly_haircuts(date) from anon;
grant execute on function public.get_global_weekly_haircuts(date) to authenticated;

drop function if exists public.get_monthly_haircut_ranking(date);

create or replace function public.get_monthly_haircut_ranking(reference_date date default current_date)
returns table (
  barber_id uuid,
  barber_name text,
  barbershop_name text,
  avatar_url text,
  total_cuts bigint
)
language sql
security definer
set search_path = public
as $$
  with month_range as (
    select
      date_trunc('month', reference_date::timestamp)::date as start_date,
      (date_trunc('month', reference_date::timestamp) + interval '1 month')::date as end_date
  )
  select
    profiles.id as barber_id,
    coalesce(nullif(trim(profiles.full_name), ''), 'Sin nombre') as barber_name,
    nullif(trim(profiles.barbershop_name), '') as barbershop_name,
    profiles.avatar_url,
    count(*)::bigint as total_cuts
  from public.haircuts
  join public.profiles on profiles.id = haircuts.user_id
  cross join month_range
  where auth.uid() is not null
    and profiles.is_active = true
    and haircuts.haircut_date >= month_range.start_date
    and haircuts.haircut_date < month_range.end_date
  group by profiles.id, profiles.full_name, profiles.barbershop_name, profiles.avatar_url
  having count(*) > 0
  order by total_cuts desc, barber_name asc;
$$;

revoke all on function public.get_monthly_haircut_ranking(date) from public;
revoke all on function public.get_monthly_haircut_ranking(date) from anon;
grant execute on function public.get_monthly_haircut_ranking(date) to authenticated;
