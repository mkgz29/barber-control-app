create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_name_not_blank check (length(trim(name)) > 0)
);

create unique index if not exists services_name_normalized_key
on public.services (lower(btrim(name)));

create index if not exists services_is_active_idx on public.services (is_active);

alter table public.services enable row level security;

revoke all on table public.services from anon, authenticated;
grant select, insert, update on table public.services to authenticated;

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

alter table public.haircuts
  add column if not exists service_id uuid references public.services (id) on delete set null,
  add column if not exists service_name_snapshot text,
  add column if not exists base_price numeric(10,2),
  add column if not exists final_price numeric(10,2);

update public.haircuts
set
  service_name_snapshot = coalesce(service_name_snapshot, service),
  base_price = coalesce(base_price, price),
  final_price = coalesce(final_price, price)
where service_name_snapshot is null
   or base_price is null
   or final_price is null;

alter table public.haircuts
  drop constraint if exists haircuts_base_price_check,
  drop constraint if exists haircuts_final_price_check,
  drop constraint if exists haircuts_service_name_snapshot_not_blank;

alter table public.haircuts
  add constraint haircuts_base_price_check check (base_price is null or base_price >= 0),
  add constraint haircuts_final_price_check check (final_price is null or final_price >= 0),
  add constraint haircuts_service_name_snapshot_not_blank
    check (service_name_snapshot is null or length(trim(service_name_snapshot)) > 0);

create index if not exists haircuts_service_id_idx on public.haircuts (service_id);

grant select, insert, update, delete on table public.haircuts to authenticated;

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

  if tg_op = 'UPDATE' and old.service_id is not null and new.service_id is null then
    raise exception 'No se puede quitar el servicio del catalogo de un corte existente.';
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
  elsif tg_op = 'UPDATE' and new.service_id is not null then
    new.service_name_snapshot = old.service_name_snapshot;
    new.base_price = old.base_price;
    new.service = old.service_name_snapshot;
    new.final_price = coalesce(new.final_price, new.price, old.final_price, old.price);
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

  if new.service_id is not null and (new.base_price is null or new.base_price < 0) then
    raise exception 'El precio base historico del corte es invalido.';
  end if;

  if new.service_id is null and (new.base_price is null or new.base_price < 0) then
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
