-- Law-Tech Production schedule semantics repair
-- Verified first in isolated Supabase project ldciqxzczwpuhhgeinmc.
-- Production target: htbbkcxevcouwehpugwc.
-- Scope is intentionally additive and narrow.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.schedule_items
  add column if not exists content_type text not null default 'action'::text
    check (content_type in ('action', 'reading')),
  add column if not exists importance text not null default 'normal'::text
    check (importance in ('important', 'normal')),
  add column if not exists urgency text not null default 'not_urgent'::text
    check (urgency in ('urgent', 'not_urgent')),
  add column if not exists is_pinned boolean not null default false,
  add column if not exists priority_source text not null default 'ai'::text
    check (priority_source in ('ai', 'user', 'rule')),
  add column if not exists importance_source text not null default 'ai'::text
    check (importance_source in ('ai', 'user', 'rule')),
  add column if not exists urgency_source text not null default 'ai'::text
    check (urgency_source in ('ai', 'user', 'rule'));

update public.schedule_items
set content_type = 'reading'
where content_type = 'action'
  and (section = '阅读' or section_key = 'reading' or schedule_date = 'reading');

update public.schedule_items
set
  importance = case when priority = 'high' then 'important' else importance end,
  urgency = case
    when schedule_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      and schedule_date <= to_char(
        (now() at time zone 'Asia/Shanghai')::date + interval '1 day',
        'YYYY-MM-DD'
      )
    then 'urgent'
    else urgency
  end
where importance_source <> 'user'
  and urgency_source <> 'user';

create index if not exists idx_schedule_items_owner_type
  on public.schedule_items(owner_id, content_type, status, schedule_date);

notify pgrst, 'reload schema';

commit;
