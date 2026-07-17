select policyname, cmd, roles, qual, with_check from pg_policies where tablename = 'service_orders';
