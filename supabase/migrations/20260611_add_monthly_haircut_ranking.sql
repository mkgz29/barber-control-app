drop function if exists public.get_monthly_haircut_ranking(date);

create or replace function public.get_monthly_haircut_ranking(reference_date date default current_date)
returns table (
  barber_name text,
  barbershop_name text,
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
    coalesce(nullif(trim(profiles.full_name), ''), 'Sin nombre') as barber_name,
    nullif(trim(profiles.barbershop_name), '') as barbershop_name,
    count(*)::bigint as total_cuts
  from public.haircuts
  join public.profiles on profiles.id = haircuts.user_id
  cross join month_range
  where auth.uid() is not null
    and profiles.is_active = true
    and haircuts.haircut_date >= month_range.start_date
    and haircuts.haircut_date < month_range.end_date
  group by profiles.id, profiles.full_name, profiles.barbershop_name
  having count(*) > 0
  order by total_cuts desc, barber_name asc;
$$;

revoke all on function public.get_monthly_haircut_ranking(date) from public;
revoke all on function public.get_monthly_haircut_ranking(date) from anon;
grant execute on function public.get_monthly_haircut_ranking(date) to authenticated;
