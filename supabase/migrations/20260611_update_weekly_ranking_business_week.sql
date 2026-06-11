create or replace function public.get_global_weekly_haircuts(reference_date date default current_date)
returns table (
  barber_name text,
  barbershop_name text,
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
    coalesce(nullif(trim(profiles.full_name), ''), 'Sin nombre') as barber_name,
    nullif(trim(profiles.barbershop_name), '') as barbershop_name,
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
  group by 1, 2
  order by total_cuts desc, barber_name asc
  limit 5;
$$;

grant execute on function public.get_global_weekly_haircuts(date) to authenticated;
