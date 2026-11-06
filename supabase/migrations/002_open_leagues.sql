-- Signed-in players can create a league. Billing is not part of the product yet.
drop policy if exists "pro owners insert leagues" on public.leagues;
drop policy if exists "owners insert leagues" on public.leagues;

create policy "owners insert leagues"
  on public.leagues for insert
  to authenticated
  with check (owner_id = auth.uid());
