-- MeaningfulMeet Find Twin: additive production schema template, NOT applied locally.
-- The running demo uses its own serialized file store and the upstream meeting adapter.
-- Expected upstream mapping: meeting_requests(id,event_id,owner_user_id,candidate_id,
-- requester_accepted,recipient_accepted,status); event_attendees(event_id,user_id).
-- Upstream IDs are compared as text so adapters can use UUID or stable string IDs.
-- If the upstream schema differs, adapt these two authorization helpers before applying.
-- Helpers fail closed when the expected upstream tables/columns are unavailable.

create or replace function public.find_twin_event_member(p_event_id text)
returns boolean language plpgsql stable security definer set search_path = public, pg_temp as $$
declare allowed boolean := false;
begin
  if auth.uid() is null or to_regclass('public.event_attendees') is null then return false; end if;
  execute 'select exists(select 1 from public.event_attendees where event_id::text=$1 and user_id::text=$2)'
    into allowed using p_event_id, auth.uid()::text;
  return allowed;
exception when undefined_column then return false;
end; $$;

create or replace function public.find_twin_meeting_member(p_meeting_id text, p_event_id text, p_writable boolean default false)
returns boolean language plpgsql stable security definer set search_path = public, pg_temp as $$
declare allowed boolean := false;
begin
  if auth.uid() is null or to_regclass('public.meeting_requests') is null then return false; end if;
  execute 'select exists(select 1 from public.meeting_requests where id::text=$1 and event_id::text=$2
    and (owner_user_id::text=$3 or candidate_id::text=$3)
    and requester_accepted is true and recipient_accepted is true
    and (status=''accepted'' or (not $4 and status=''completed'')))'
    into allowed using p_meeting_id,p_event_id,auth.uid()::text,p_writable;
  return allowed;
exception when undefined_column then return false;
end; $$;

revoke all on function public.find_twin_event_member(text) from public;
revoke all on function public.find_twin_meeting_member(text,text,boolean) from public;
grant execute on function public.find_twin_event_member(text) to authenticated;
grant execute on function public.find_twin_meeting_member(text,text,boolean) to authenticated;

create table if not exists public.venue_floors (
  id text not null, event_id text not null, venue_id text not null, label text not null,
  image_path text not null, width integer not null check(width>0), height integer not null check(height>0),
  primary key(event_id,id)
);
create table if not exists public.venue_zones (
  id text not null, event_id text not null, floor_id text not null, label text not null,
  x numeric not null, y numeric not null, description text not null,
  is_meeting_spot boolean not null default true,
  kind text not null default 'landmark' check(kind in('landmark','corridor')),
  primary key(event_id,id), foreign key(event_id,floor_id) references public.venue_floors(event_id,id)
);
create table if not exists public.venue_paths (
  id uuid primary key default gen_random_uuid(), event_id text not null,
  from_zone_id text not null, to_zone_id text not null, length_units numeric check(length_units>0),
  foreign key(event_id,from_zone_id) references public.venue_zones(event_id,id),
  foreign key(event_id,to_zone_id) references public.venue_zones(event_id,id),
  unique(event_id,from_zone_id,to_zone_id)
);
create table if not exists public.meeting_rendezvous (
  meeting_id text primary key, event_id text not null, zone_id text,
  status text not null default 'none' check(status in('none','proposed','confirmed','declined')),
  proposed_by_user_id uuid references auth.users(id), proposal_version integer not null default 0 check(proposal_version>=0),
  confirmed_at timestamptz, updated_at timestamptz not null default now(),
  foreign key(event_id,zone_id) references public.venue_zones(event_id,id)
);
-- No shadow meetings table is created. Bind the foreign key to the upstream table
-- only after confirming ID types. This template uses stable text meeting IDs.
do $$ begin
  if to_regclass('public.meeting_requests') is not null and exists(
    select 1 from information_schema.columns where table_schema='public' and table_name='meeting_requests' and column_name='id' and data_type='text'
  ) and not exists(select 1 from pg_constraint where conname='find_twin_upstream_meeting_fk') then
    alter table public.meeting_rendezvous add constraint find_twin_upstream_meeting_fk
      foreign key(meeting_id) references public.meeting_requests(id) on delete cascade;
  end if;
end $$;
create table if not exists public.meeting_zone_checkins (
  meeting_id text not null references public.meeting_rendezvous(meeting_id) on delete cascade,
  user_id uuid not null references auth.users(id), zone_id text not null, event_id text not null,
  source text not null default 'self_reported' check(source='self_reported'),
  created_at timestamptz not null default now(), expires_at timestamptz not null, revoked_at timestamptz,
  primary key(meeting_id,user_id), foreign key(event_id,zone_id) references public.venue_zones(event_id,id),
  check(expires_at>created_at and expires_at<=created_at+interval '15 minutes')
);
create table if not exists public.meeting_arrivals (
  meeting_id text not null references public.meeting_rendezvous(meeting_id) on delete cascade,
  user_id uuid not null references auth.users(id), arrived_at timestamptz,
  primary key(meeting_id,user_id)
);
create table if not exists public.meeting_verifications (
  meeting_id text not null references public.meeting_rendezvous(meeting_id) on delete cascade,
  user_id uuid not null references auth.users(id), confirmed_at timestamptz not null default now(),
  verification_method text not null check(verification_method in('mutual_confirm','qr')),
  primary key(meeting_id,user_id)
);
create table if not exists public.meeting_xp_awards (
  meeting_id text not null references public.meeting_rendezvous(meeting_id) on delete cascade,
  user_id uuid not null references auth.users(id), points integer not null check(points=50),
  reason text not null default 'meeting_completed' check(reason='meeting_completed'),
  created_at timestamptz not null default now(), primary key(meeting_id,user_id,reason)
);
create table if not exists public.meeting_location_events (
  id uuid primary key default gen_random_uuid(), event_id text not null,
  meeting_id text not null references public.meeting_rendezvous(meeting_id) on delete cascade,
  run_id text, seq bigint not null check(seq>0), type text not null, payload jsonb not null default '{}',
  created_at timestamptz not null default now(), unique(meeting_id,seq)
);
create table if not exists public.meeting_location_audit (
  id uuid primary key default gen_random_uuid(), meeting_id text not null,
  actor_id uuid not null references auth.users(id), action text not null, created_at timestamptz not null default now()
);

alter table public.venue_floors enable row level security;
alter table public.venue_zones enable row level security;
alter table public.venue_paths enable row level security;
alter table public.meeting_rendezvous enable row level security;
alter table public.meeting_zone_checkins enable row level security;
alter table public.meeting_arrivals enable row level security;
alter table public.meeting_verifications enable row level security;
alter table public.meeting_xp_awards enable row level security;
alter table public.meeting_location_events enable row level security;
alter table public.meeting_location_audit enable row level security;

create policy find_twin_floors_read on public.venue_floors for select to authenticated
  using(public.find_twin_event_member(event_id));
create policy find_twin_zones_read on public.venue_zones for select to authenticated
  using(public.find_twin_event_member(event_id));
create policy find_twin_paths_read on public.venue_paths for select to authenticated
  using(public.find_twin_event_member(event_id));
create policy find_twin_rendezvous_read on public.meeting_rendezvous for select to authenticated
  using(public.find_twin_meeting_member(meeting_id,event_id));
-- Client writes for proposals, verification and XP are intentionally denied.
-- A trusted server transaction enforces optimistic locking, independent consent,
-- event end, upstream completion, and idempotency before changing those records.
-- Check-ins stay server-only. Direct client access is denied by RLS so event-end,
-- current consent, expiration and revocation cannot be bypassed through the SDK.
-- The session-authorized API projects only current explicitly shared zones.
create policy find_twin_arrivals_read on public.meeting_arrivals for select to authenticated
  using(exists(select 1 from public.meeting_rendezvous r where r.meeting_id=meeting_arrivals.meeting_id and public.find_twin_meeting_member(r.meeting_id,r.event_id)));
create policy find_twin_verifications_read on public.meeting_verifications for select to authenticated
  using(exists(select 1 from public.meeting_rendezvous r where r.meeting_id=meeting_verifications.meeting_id and public.find_twin_meeting_member(r.meeting_id,r.event_id)));
create policy find_twin_xp_read_own on public.meeting_xp_awards for select to authenticated
  using(user_id=auth.uid() and exists(select 1 from public.meeting_rendezvous r where r.meeting_id=meeting_xp_awards.meeting_id and public.find_twin_meeting_member(r.meeting_id,r.event_id)));
-- No direct SELECT policies on location events or audit logs: the authenticated
-- SSE server returns invalidations only, never replayed private check-in zones.
