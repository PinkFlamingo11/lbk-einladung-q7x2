-- Last Birthday in Köln: Datenbank für Zusagen und Zapf-Werte
-- Gäste dürfen nur über zwei Funktionen schreiben und nichts lesen.
-- Lesen darf nur das Konto car.freude@gmail.com (Admin-Seite mit Login).

create table if not exists public.rsvps (
  id          uuid primary key,
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 2 and 80),
  status      text not null check (status in ('yes','maybe','no')),
  guests      int  not null default 1 check (guests between 1 and 6),
  arrival     text check (arrival is null or char_length(arrival) <= 20),
  note        text check (note is null or char_length(note) <= 400),
  score       int  check (score is null or score between 0 and 600),
  glasses     jsonb,
  scored_at   timestamptz
);

alter table public.rsvps enable row level security;

revoke all on public.rsvps from anon;
revoke all on public.rsvps from authenticated;
grant select, delete on public.rsvps to authenticated;

drop policy if exists "owner read" on public.rsvps;
create policy "owner read" on public.rsvps for select to authenticated
  using ((auth.jwt() ->> 'email') = 'car.freude@gmail.com');

drop policy if exists "owner delete" on public.rsvps;
create policy "owner delete" on public.rsvps for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'car.freude@gmail.com');

create or replace function public.submit_rsvp(
  p_id uuid, p_name text, p_status text, p_guests int, p_arrival text, p_note text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.rsvps (id, name, status, guests, arrival, note)
  values (p_id, left(btrim(p_name), 80), p_status, greatest(1, least(6, coalesce(p_guests, 1))),
          left(p_arrival, 20), left(p_note, 400))
  on conflict (id) do nothing;
end $$;

create or replace function public.submit_score(
  p_id uuid, p_score int, p_glasses jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_score is null or p_score < 0 or p_score > 600 then
    raise exception 'ungueltiger Wert';
  end if;
  update public.rsvps
     set score = p_score, glasses = p_glasses, scored_at = now()
   where id = p_id and score is null and status <> 'no';
end $$;

revoke all on function public.submit_rsvp(uuid,text,text,int,text,text) from public;
revoke all on function public.submit_score(uuid,int,jsonb) from public;
grant execute on function public.submit_rsvp(uuid,text,text,int,text,text) to anon, authenticated;
grant execute on function public.submit_score(uuid,int,jsonb) to anon, authenticated;
