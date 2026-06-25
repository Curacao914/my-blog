alter table captures add column if not exists sender_id text;
alter table captures add column if not exists message_id text;
alter table captures add column if not exists idempotency_key text;
alter table captures add column if not exists result jsonb not null default '{}'::jsonb;

create unique index if not exists idx_captures_owner_idempotency
  on captures(owner_id, idempotency_key)
  where idempotency_key is not null;
