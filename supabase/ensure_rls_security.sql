-- Remover as políticas anteriores se existirem
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Allow admins full access to wallets" ON public.wallets;
DROP POLICY IF EXISTS "Allow users to read their own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Allow admins full access to wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Allow users to read and insert their own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Allow users to insert their own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Allow admins full access to withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Allow users to read their own investor quotas" ON public.investor_quotas;
DROP POLICY IF EXISTS "Allow admins full access to investor quotas" ON public.investor_quotas;

-- Habilitar Row Level Security (RLS) nas tabelas críticas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_quotas ENABLE ROW LEVEL SECURITY;

-- 1. Políticas para PROFILES (Evitando recursão infinita usando auth.jwt() para checar role admin)
CREATE POLICY "Allow users to read their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Allow admins full access to profiles" 
ON public.profiles FOR ALL 
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 2. Políticas para WALLETS
CREATE POLICY "Allow users to read their own wallet" 
ON public.wallets FOR SELECT 
USING (auth.uid() = profile_id);

CREATE POLICY "Allow admins full access to wallets" 
ON public.wallets FOR ALL 
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 3. Políticas para WALLET_TRANSACTIONS
CREATE POLICY "Allow users to read their own wallet transactions" 
ON public.wallet_transactions FOR SELECT 
USING (auth.uid() = profile_id);

CREATE POLICY "Allow admins full access to wallet transactions" 
ON public.wallet_transactions FOR ALL 
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 4. Políticas para WITHDRAWAL_REQUESTS
CREATE POLICY "Allow users to read their own withdrawal requests" 
ON public.withdrawal_requests FOR SELECT 
USING (auth.uid() = profile_id);

CREATE POLICY "Allow users to insert their own withdrawal requests" 
ON public.withdrawal_requests FOR INSERT 
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Allow admins full access to withdrawal requests" 
ON public.withdrawal_requests FOR ALL 
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 5. Políticas para INVESTOR_QUOTAS
CREATE POLICY "Allow users to read their own investor quotas" 
ON public.investor_quotas FOR SELECT 
USING (auth.uid() = profile_id);

CREATE POLICY "Allow admins full access to investor quotas" 
ON public.investor_quotas FOR ALL 
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
