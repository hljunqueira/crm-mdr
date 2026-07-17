select tablename, rowsecurity from pg_tables where tablename in ('sales', 'installments');
