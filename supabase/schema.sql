create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  barbershop_name text,
  avatar_url text,
  role text not null default 'barber' check (role in ('admin', 'barber')),
  is_active boolean not null default true,
  commission_percentage numeric(5,2) not null default 45,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_name_not_blank check (length(trim(name)) > 0)
);

create table if not exists public.haircuts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  service text not null,
  service_name_snapshot text,
  base_price numeric(10,2),
  final_price numeric(10,2),
  price numeric(10,2) not null check (price >= 0),
  commission_percentage numeric(5,2) not null check (commission_percentage >= 0 and commission_percentage <= 100),
  commission_amount numeric(10,2) not null check (commission_amount >= 0),
  haircut_date date not null,
  attendance_type text default 'walk_in' check (attendance_type in ('appointment', 'walk_in')),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists haircuts_user_id_idx on public.haircuts (user_id);
create index if not exists haircuts_haircut_date_idx on public.haircuts (haircut_date);
create index if not exists haircuts_service_id_idx on public.haircuts (service_id);
create unique index if not exists services_name_normalized_key
on public.services (lower(btrim(name)));
create index if not exists services_is_active_idx on public.services (is_active);

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
alter table public.services enable row level security;
alter table public.haircuts enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.services from anon, authenticated;
revoke all on table public.haircuts from anon, authenticated;

grant usage on schema public to authenticated;
grant select, insert on table public.profiles to authenticated;
grant update (full_name, barbershop_name, email, avatar_url) on table public.profiles to authenticated;
grant select, insert, update on table public.services to authenticated;
grant select, insert, update, delete on table public.haircuts to authenticated;

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

drop policy if exists "services_select_active_or_admin" on public.services;
create policy "services_select_active_or_admin"
on public.services
for select
to authenticated
using (
  is_active = true
  or exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
  )
);

drop policy if exists "services_insert_admin" on public.services;
create policy "services_insert_admin"
on public.services
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
  )
);

drop policy if exists "services_update_admin" on public.services;
create policy "services_update_admin"
on public.services
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
  )
);

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

drop policy if exists "haircuts_update_own" on public.haircuts;
create policy "haircuts_update_own"
on public.haircuts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "haircuts_delete_own" on public.haircuts;
create policy "haircuts_delete_own"
on public.haircuts
for delete
to authenticated
using (auth.uid() = user_id);

alter table public.haircuts
  drop constraint if exists haircuts_base_price_check,
  drop constraint if exists haircuts_final_price_check,
  drop constraint if exists haircuts_service_name_snapshot_not_blank;

alter table public.haircuts
  add constraint haircuts_base_price_check check (base_price is null or base_price >= 0),
  add constraint haircuts_final_price_check check (final_price is null or final_price >= 0),
  add constraint haircuts_service_name_snapshot_not_blank
    check (service_name_snapshot is null or length(trim(service_name_snapshot)) > 0);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
before update on public.services
for each row
execute function public.set_updated_at();

create or replace function public.sync_haircut_service_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_service record;
begin
  if tg_op = 'INSERT' and new.service_id is null then
    raise exception 'Selecciona un servicio del catalogo.';
  end if;

  if new.service_id is not null
    and (
      tg_op = 'INSERT'
      or (tg_op = 'UPDATE' and old.service_id is distinct from new.service_id)
    )
  then
    select id, name, price, is_active
    into selected_service
    from public.services
    where id = new.service_id;

    if not found then
      raise exception 'El servicio seleccionado no existe.';
    end if;

    if selected_service.is_active is not true then
      raise exception 'El servicio seleccionado no esta activo.';
    end if;

    new.service_name_snapshot = selected_service.name;
    new.base_price = selected_service.price;
    new.service = selected_service.name;
    new.final_price = coalesce(new.final_price, new.price, selected_service.price);
  else
    new.service_name_snapshot = coalesce(
      nullif(trim(new.service_name_snapshot), ''),
      nullif(trim(new.service), '')
    );
    new.base_price = coalesce(new.base_price, new.final_price, new.price);
    new.final_price = coalesce(new.final_price, new.price, new.base_price);
  end if;

  if new.service_name_snapshot is null or length(trim(new.service_name_snapshot)) = 0 then
    raise exception 'El servicio es requerido.';
  end if;

  if new.final_price is null or new.final_price < 0 then
    raise exception 'El precio es requerido y debe ser mayor o igual a 0.';
  end if;

  if new.base_price is null or new.base_price < 0 then
    new.base_price = new.final_price;
  end if;

  new.service_name_snapshot = trim(new.service_name_snapshot);
  new.service = new.service_name_snapshot;
  new.price = new.final_price;

  if new.commission_percentage is not null then
    new.commission_amount = (new.final_price * new.commission_percentage) / 100;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_haircut_service_snapshot on public.haircuts;
create trigger sync_haircut_service_snapshot
before insert or update on public.haircuts
for each row
execute function public.sync_haircut_service_snapshot();

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

drop function if exists public.admin_update_profile(uuid, boolean, numeric);

create or replace function public.admin_update_profile(
  target_profile_id uuid,
  new_is_active boolean,
  new_commission_percentage numeric,
  new_barbershop_name text default null
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
    commission_percentage = coalesce(new_commission_percentage, commission_percentage),
    barbershop_name = case
      when new_barbershop_name is null then null
      else nullif(trim(new_barbershop_name), '')
    end
  where id = target_profile_id;
end;
$$;

grant execute on function public.admin_update_profile(uuid, boolean, numeric, text) to authenticated;
