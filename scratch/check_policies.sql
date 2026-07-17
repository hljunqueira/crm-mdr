select policyname, roles, cmd, qual from pg_policies where tablename in ('profiles', 'user_permissions');
