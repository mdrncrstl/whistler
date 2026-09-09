create policy "masterdeck_profiles_server_only" on public.masterdeck_profiles for all to anon, authenticated using (false) with check (false);
create policy "masterdeck_connections_server_only" on public.masterdeck_broker_connections for all to anon, authenticated using (false) with check (false);
create policy "masterdeck_accounts_server_only" on public.masterdeck_accounts for all to anon, authenticated using (false) with check (false);
create policy "masterdeck_positions_server_only" on public.masterdeck_positions for all to anon, authenticated using (false) with check (false);
create policy "masterdeck_transactions_server_only" on public.masterdeck_transactions for all to anon, authenticated using (false) with check (false);
create policy "masterdeck_cash_server_only" on public.masterdeck_cash_balances for all to anon, authenticated using (false) with check (false);
create policy "masterdeck_snapshots_server_only" on public.masterdeck_portfolio_snapshots for all to anon, authenticated using (false) with check (false);
create policy "masterdeck_sync_runs_server_only" on public.masterdeck_sync_runs for all to anon, authenticated using (false) with check (false);;
