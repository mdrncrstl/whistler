create index if not exists masterdeck_accounts_connection_idx on public.masterdeck_accounts(broker_connection_id);
create index if not exists masterdeck_positions_connection_idx on public.masterdeck_positions(broker_connection_id);
create index if not exists masterdeck_transactions_connection_idx on public.masterdeck_transactions(broker_connection_id);
create index if not exists masterdeck_cash_connection_idx on public.masterdeck_cash_balances(broker_connection_id);
create index if not exists masterdeck_sync_runs_connection_idx on public.masterdeck_sync_runs(broker_connection_id);;
