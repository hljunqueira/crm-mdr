select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.service_orders'::regclass;
