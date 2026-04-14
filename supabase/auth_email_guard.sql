create table if not exists public.auth_email_events (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  normalized_email text not null,
  flow text not null check (flow in ('signup', 'magic_link', 'password_reset', 'resend_confirmation')),
  status text not null check (status in ('accepted', 'blocked', 'failed')),
  reason text,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists auth_email_events_lookup_idx
  on public.auth_email_events (normalized_email, flow, created_at desc);

revoke all on public.auth_email_events from anon, authenticated;

create or replace function public.consume_auth_email_attempt(
  p_email text,
  p_flow text,
  p_ip inet default null,
  p_user_agent text default null,
  p_cooldown_seconds integer default 60,
  p_window_minutes integer default 15,
  p_max_attempts integer default 3
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_retry_after integer := 0;
  v_attempts integer := 0;
begin
  select count(*)
  into v_attempts
  from public.auth_email_events
  where normalized_email = lower(trim(p_email))
    and flow = p_flow
    and created_at >= v_now - make_interval(mins => p_window_minutes)
    and status in ('accepted', 'failed');

  if v_attempts >= p_max_attempts then
    select greatest(
      1,
      ceil(extract(epoch from ((min(created_at) + make_interval(mins => p_window_minutes)) - v_now)))
    )::integer
    into v_retry_after
    from public.auth_email_events
    where normalized_email = lower(trim(p_email))
      and flow = p_flow
      and created_at >= v_now - make_interval(mins => p_window_minutes)
      and status in ('accepted', 'failed');

    insert into public.auth_email_events (
      email,
      normalized_email,
      flow,
      status,
      reason,
      ip,
      user_agent
    )
    values (
      p_email,
      lower(trim(p_email)),
      p_flow,
      'blocked',
      'window_limit',
      p_ip,
      p_user_agent
    );

    return query select false, v_retry_after, 'Demasiados intentos en poco tiempo.';
    return;
  end if;

  select greatest(
    0,
    ceil(extract(epoch from ((max(created_at) + make_interval(secs => p_cooldown_seconds)) - v_now)))
  )::integer
  into v_retry_after
  from public.auth_email_events
  where normalized_email = lower(trim(p_email))
    and flow = p_flow
    and status = 'accepted';

  if v_retry_after > 0 then
    insert into public.auth_email_events (
      email,
      normalized_email,
      flow,
      status,
      reason,
      ip,
      user_agent
    )
    values (
      p_email,
      lower(trim(p_email)),
      p_flow,
      'blocked',
      'cooldown',
      p_ip,
      p_user_agent
    );

    return query select false, v_retry_after, 'Esperá antes de volver a solicitar otro email.';
    return;
  end if;

  insert into public.auth_email_events (
    email,
    normalized_email,
    flow,
    status,
    reason,
    ip,
    user_agent
  )
  values (
    p_email,
    lower(trim(p_email)),
    p_flow,
    'accepted',
    null,
    p_ip,
    p_user_agent
  );

  return query select true, 0, ''::text;
end;
$$;

revoke all on function public.consume_auth_email_attempt(text, text, inet, text, integer, integer, integer) from public;
