SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('service_orders', 'customers');
