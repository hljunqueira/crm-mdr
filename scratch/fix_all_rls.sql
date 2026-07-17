-- 1. cash_shifts
ALTER TABLE public.cash_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.cash_shifts;
CREATE POLICY "Permitir tudo para autenticados" ON public.cash_shifts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. cash_transactions
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.cash_transactions;
CREATE POLICY "Permitir tudo para autenticados" ON public.cash_transactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. device_locks
ALTER TABLE public.device_locks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.device_locks;
CREATE POLICY "Permitir tudo para autenticados" ON public.device_locks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. credit_queries_history
ALTER TABLE public.credit_queries_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.credit_queries_history;
CREATE POLICY "Permitir tudo para autenticados" ON public.credit_queries_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. scp_investment_rules
ALTER TABLE public.scp_investment_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.scp_investment_rules;
CREATE POLICY "Permitir tudo para autenticados" ON public.scp_investment_rules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. ai_settings
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.ai_settings;
CREATE POLICY "Permitir tudo para autenticados" ON public.ai_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. scp_audit_logs
ALTER TABLE public.scp_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.scp_audit_logs;
CREATE POLICY "Permitir tudo para autenticados" ON public.scp_audit_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. lots
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.lots;
CREATE POLICY "Permitir tudo para autenticados" ON public.lots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
