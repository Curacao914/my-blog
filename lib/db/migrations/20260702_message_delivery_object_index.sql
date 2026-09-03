create index if not exists message_deliveries_object_lookup_idx
  on public.message_deliveries (
    owner_id,
    purpose,
    object_type,
    object_id,
    status,
    scheduled_for
  );
