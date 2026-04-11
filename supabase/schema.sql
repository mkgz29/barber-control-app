create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'barber' check (role in ('admin', 'barber')),
  is_active boolean not null default true,
  commission_percentage numeric(5,2) not null default 45,
  created_at timestamptz not null default now()
);

create table if not exists public.haircuts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  service text not null,
  price numeric(10,2) not null check (price >= 0),
  commission_percentage numeric(5,2) not null check (commission_percentage >= 0 and commission_percentage <= 100),
  commission_amount numeric(10,2) not null check (commission_amount >= 0),
  haircut_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists haircuts_user_id_idx on public.haircuts (user_id);
create index if not exists haircuts_haircut_date_idx on public.haircuts (haircut_date);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.haircuts enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.haircuts from anon, authenticated;

grant usage on schema public to authenticated;
grant select, insert on table public.profiles to authenticated;
grant update (full_name, email) on table public.profiles to authenticated;
grant select, insert on table public.haircuts to authenticated;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
  )
);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "haircuts_select_own_or_admin" on public.haircuts;
create policy "haircuts_select_own_or_admin"
on public.haircuts
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
  )
);

drop policy if exists "haircuts_insert_own" on public.haircuts;
create policy "haircuts_insert_own"
on public.haircuts
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.admin_update_profile(
  target_profile_id uuid,
  new_is_active boolean,
  new_commission_percentage numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  ) then
    raise exception 'No autorizado';
  end if;

  if new_commission_percentage is not null and (new_commission_percentage < 0 or new_commission_percentage > 100) then
    raise exception 'El porcentaje debe estar entre 0 y 100';
  end if;

  update public.profiles
  set
    is_active = coalesce(new_is_active, is_active),
    commission_percentage = coalesce(new_commission_percentage, commission_percentage)
  where id = target_profile_id;
end;
$$;

grant execute on function public.admin_update_profile(uuid, boolean, numeric) to authenticated;
