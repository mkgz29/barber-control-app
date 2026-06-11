alter table public.haircuts
  add column if not exists attendance_type text;

alter table public.haircuts
  add column if not exists recorded_at timestamptz;

update public.haircuts
set recorded_at = created_at
where recorded_at is null;

alter table public.haircuts
  alter column attendance_type set default 'walk_in',
  alter column recorded_at set default now(),
  alter column recorded_at set not null;

alter table public.haircuts
  drop constraint if exists haircuts_attendance_type_check;

alter table public.haircuts
  add constraint haircuts_attendance_type_check
  check (attendance_type in ('appointment', 'walk_in'));
