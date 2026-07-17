import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase.js';
import { formatWhatsAppJid } from "../lib/phoneHelper.js";
import crypto from 'crypto';
import { db } from '../db/connection.js';
import { localAuthCache, profiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

const useSupabase = (req: any) => {
  const host = req.headers.host || '';
  return host.includes('mdrinformaticaecelulares.com.br') || 
         process.env.IS_VPS === 'true' || 
         (!host.includes('localhost') && !host.includes('127.0.0.1'));
};

// POST /api/users/cache-credentials — Salvar credenciais para login offline
router.post('/cache-credentials', async (req, res) => {
  try {
    if (useSupabase(req)) {
      return res.json({ success: true, message: 'Operação ignorada em ambiente online.' });
    }
    const { userId, email, password } = req.body;
    if (!userId || !email || !password) {
      return res.status(400).json({ error: 'Faltam dados obrigatórios.' });
    }
    const passwordHash = hashPassword(password);

    await db.insert(localAuthCache).values({
      id: userId,
      email: email.toLowerCase().trim(),
      passwordHash,
      salt: '',
      updatedAt: new Date().toISOString()
    }).onConflictDoUpdate({
      target: localAuthCache.id,
      set: {
        email: email.toLowerCase().trim(),
        passwordHash,
        updatedAt: new Date().toISOString()
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[CacheCredentials] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/login-offline — Autenticação offline no SQLite
router.post('/login-offline', async (req, res) => {
  try {
    if (useSupabase(req)) {
      return res.status(400).json({ error: 'Login offline não é permitido em ambiente online.' });
    }
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const lowercaseEmail = email.toLowerCase().trim();
    const { profiles } = await import('../db/schema.js');

    // Buscar usuário localmente no SQLite diretamente na tabela de perfis
    const [profile] = await db.select()
      .from(profiles)
      .where(eq(profiles.email, lowercaseEmail))
      .limit(1);

    if (!profile) {
      return res.status(401).json({ error: 'Usuário não encontrado offline. Realize o primeiro login no modo Online ou sincronize o banco local.' });
    }

    if (!profile.passwordHash) {
      return res.status(401).json({ error: 'Senha não cacheada. Faça login no modo online primeiro para salvar a credencial.' });
    }

    if (!verifyPassword(password, profile.passwordHash)) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    res.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        unit_id: profile.storeId,
        fullName: profile.fullName
      }
    });
  } catch (error: any) {
    console.error('[LoginOffline] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/sync-pull — Disparar sincronização manual (pull de dados) do Supabase para o SQLite local
router.post('/sync-pull', async (req, res) => {
  try {
    if (useSupabase(req)) {
      return res.status(400).json({ error: 'Sincronização manual do SQLite não é permitida em ambiente online.' });
    }
    const { pullCloudChanges, pushLocalChanges } = await import('../services/syncService.js');
    console.log('[Sync Endpoint] Disparando sincronização manual...');
    await pushLocalChanges();
    await pullCloudChanges();
    res.json({ success: true, message: 'Sincronização concluída com sucesso!' });
  } catch (error: any) {
    console.error('[Sync Endpoint] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auxiliar para recalcular recebíveis futuros dinamicamente e sem cache desatualizado
async function recalculateFutureReceipts(profileId: string): Promise<number> {
  try {
    // 1. Aparelhos no modelo PRIME vinculados ao investidor
    const { data: devices } = await supabase
      .from("devices")
      .select("id, sale_price, cost_price, prime_admin_fee, prime_profit_share, prime_profit_share_value, prime_valuation_type, prime_profit_share_type")
      .eq("investor_id", profileId);

    let totalPrimeFuture = 0;

    for (const dev of (devices || [])) {
      const deviceSalePrice = dev.prime_valuation_type === "cost"
        ? Number(dev.cost_price || 0)
        : Number(dev.sale_price || 0);
      
      const { data: sale } = await supabase
        .from("sales")
        .select("id, total_value")
        .eq("device_id", dev.id)
        .not("status", "in", '("cancelled","refunded")')
        .maybeSingle();

      if (sale) {
        const saleTotal = Number(sale.total_value || 0);
        // Trava para evitar amortização/lucro negativo em vendas com desconto
        const cappedDeviceSalePrice = (saleTotal > 0 && deviceSalePrice > saleTotal)
          ? saleTotal
          : deviceSalePrice;

        const { data: insts } = await supabase
          .from("installments")
          .select("id, status, value")
          .eq("sale_id", sale.id)
          .not("status", "in", '("cancelled")');

        const unpaidInsts = (insts || []).filter(i => i.status !== "paid");
        for (const inst of unpaidInsts) {
          const instValue = Number(inst.value);
          
          const amortization = (saleTotal > 0 && dev.prime_profit_share_type !== 'profit_only')
            ? instValue * (cappedDeviceSalePrice / saleTotal)
            : 0;
            
          let investorProfit = 0;
          if (dev.prime_profit_share_value && Number(dev.prime_profit_share_value) > 0) {
            investorProfit = saleTotal > 0
              ? instValue * (Number(dev.prime_profit_share_value) / saleTotal)
              : 0;
          } else {
            const virtualAmortization = saleTotal > 0
              ? instValue * (cappedDeviceSalePrice / saleTotal)
              : 0;
            const totalProfit = instValue - virtualAmortization;
            const adminFee = Number(dev.prime_admin_fee ?? 0.10);
            const profitShare = Number(dev.prime_profit_share ?? 0.60);
            const netProfit = totalProfit * (1.0 - adminFee);
            investorProfit = netProfit * profitShare;
          }
          const expectedValue = amortization + investorProfit;

          totalPrimeFuture += expectedValue;
        }
      } else {
        // Celulares ainda em estoque mantêm o valor de aporte nos recebíveis futuros,
        // exceto se for do tipo 'profit_only' pois o investidor não receberá o capital investido de volta.
        if (dev.prime_profit_share_type !== 'profit_only') {
          totalPrimeFuture += deviceSalePrice;
        }
      }
    }

    // 2. Recebíveis comprados no modelo RENDA
    const { data: purchases } = await supabase
      .from("receivable_purchases")
      .select("sale_id, total_receivable, purchase_price, ownership_percentage, status, sales!inner(status)")
      .eq("profile_id", profileId)
      .eq("status", "approved")
      .not("sales.status", "in", '("cancelled","refunded")');

    let totalRendaFuture = 0;

    for (const pur of (purchases || [])) {
      if (pur.sale_id) {
        const { data: insts } = await supabase
          .from("installments")
          .select("id, status, value")
          .eq("sale_id", pur.sale_id)
          .not("status", "in", '("cancelled")');

        const unpaidInsts = (insts || []).filter(i => i.status !== "paid");
        for (const inst of unpaidInsts) {
          const shareValue = Number(inst.value) * Number(pur.ownership_percentage || 1);
          totalRendaFuture += shareValue;
        }
      }
    }

    return Number((totalPrimeFuture + totalRendaFuture).toFixed(2));
  } catch (err) {
    console.error(`[recalculateFutureReceipts] Erro para o investidor ${profileId}:`, err);
    return 0;
  }
}

// Helpers de criptografia nativa do Node para senhas offline
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  } catch (e) {
    return false;
  }
}

// POST /api/users/login — Autenticação híbrida (Online/Offline)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const onlineOnly = useSupabase(req);

    // 1. Tentar login online com o Supabase Auth
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!authError && data) {
      console.log(`[Auth] Login online bem-sucedido para: ${email}`);
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!onlineOnly && profileData) {
        // Cache do hash da senha localmente no SQLite para uso offline futuro (Upsert completo)
        const passHash = hashPassword(password);
        const mappedProfile = {
          id: profileData.id,
          storeId: profileData.store_id,
          email: data.user.email ? data.user.email.toLowerCase().trim() : email.toLowerCase().trim(),
          fullName: profileData.full_name,
          avatarUrl: profileData.avatar_url,
          role: profileData.role,
          active: profileData.active,
          passwordHash: passHash,
          syncStatus: 'synced',
          updatedAt: new Date().toISOString()
        };

        await db.insert(profiles)
          .values(mappedProfile)
          .onConflictDoUpdate({
            target: profiles.id,
            set: mappedProfile
          });

        // Salva também no Supabase cloud para que outros computadores possam baixar durante a sincronização
        try {
          await supabase.from('profiles')
            .update({ password_hash: passHash })
            .eq('id', profileData.id);
        } catch (cloudErr) {
          console.warn('[Auth] Ignorando salvamento de hash na nuvem (coluna password_hash pode não existir ainda):', cloudErr);
        }
      }

      return res.json({
        session: data.session,
        user: data.user,
        profile: profileData ? { ...profileData, unit_id: profileData.store_id } : null
      });
    }

    if (onlineOnly) {
      return res.status(401).json({ error: authError?.message || 'Credenciais inválidas.' });
    }

    // 2. Se falhar por erro de rede/offline, tentar login local no SQLite
    console.log(`[Auth] Falha no login online. Tentando autenticação local para: ${email}`);
    
    // Busca e-mails no Supabase Auth em lote via cache local ou lista local
    // Nota: Como não temos tabela de usuários no SQLite (profiles é apenas o perfil),
    // podemos buscar na tabela de profiles onde o email coincida (caso a gente salve o email no profile)
    // Para simplificar, buscamos o perfil pelo e-mail salvo localmente (vamos assumir que a tabela local tem os perfis).
    const localProfiles = await db.select().from(profiles);
    // Nota: para que isso funcione offline de forma precisa, precisamos salvar o email do usuário no profiles local
    // ou no cache. Como o schema do profiles no Postgres tem fullName, role, active, etc.,
    // vamos buscar se o usuário local existe.
    // Vamos procurar por id ou buscar correspondência pelo e-mail
    // Se o usuário já logou uma vez online, o ID dele está associado com o profile dele no SQLite
    // Vamos buscar perfis locais
    const matchedProfile = localProfiles.find(p => p.passwordHash && verifyPassword(password, p.passwordHash));

    if (matchedProfile) {
      console.log(`[Auth] Login offline bem-sucedido para: ${email} (via SQLite)`);
      
      // Cria uma sessão mockada local
      const mockSession = {
        access_token: 'local-mock-token-' + crypto.randomUUID(),
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'local-mock-refresh',
        user: {
          id: matchedProfile.id,
          email: email,
          role: matchedProfile.role || 'attendant',
        }
      };

      return res.json({
        session: mockSession,
        user: mockSession.user,
        profile: {
          id: matchedProfile.id,
          unit_id: matchedProfile.storeId,
          full_name: matchedProfile.fullName,
          role: matchedProfile.role,
          avatar_url: matchedProfile.avatarUrl,
        }
      });
    }

    return res.status(401).json({ error: authError?.message || 'Credenciais inválidas ou usuário nunca logou nesta máquina online.' });
  } catch (error: any) {
    console.error('[Auth Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/session — Obter sessão atual
router.get('/session', async (req, res) => {
  // Retorna os dados da sessão
  res.json({ session: null }); // Implementação simples
});

// GET /api/users — Listar todos os perfis e e-mails dos usuários
router.get('/', async (req, res) => {
  try {
    // 1. Buscar perfis no banco
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profError) {
      console.error('[Users GET] Erro ao buscar perfis:', profError);
      return res.status(400).json({ error: profError.message });
    }

    // Buscar carteiras no banco
    const { data: wallets } = await supabase
      .from('wallets')
      .select('profile_id, balance, future_receipts');

    // 2. Buscar e-mails do Supabase Auth (usando Admin SDK)
    let authUsers: any[] = [];
    try {
      const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) {
        console.warn('[Users GET] Não foi possível obter usuários do Auth:', authError);
      } else {
        authUsers = users || [];
      }
    } catch (e) {
      console.warn('[Users GET] Falha silenciosa no Auth SDK:', e);
    }

    // 3. Mesclar e-mails e saldos recalculados em tempo real
    const merged = await Promise.all(profiles.map(async profile => {
      const authUser = authUsers.find(u => u.id === profile.id);
      const walletObj = wallets?.find(w => w.profile_id === profile.id);
      
      let futureReceipts = walletObj ? Number(walletObj.future_receipts) : 0;

      if (profile.role === 'investor') {
        futureReceipts = await recalculateFutureReceipts(profile.id);
        
        // Atualizar o banco de dados se houver divergência
        if (walletObj && Number(walletObj.future_receipts) !== futureReceipts) {
          try {
            await supabase
              .from('wallets')
              .update({ future_receipts: futureReceipts, updated_at: new Date().toISOString() })
              .eq('profile_id', profile.id);
          } catch (dbErr) {
            console.error('[Users GET] Erro ao atualizar cache de carteira:', dbErr);
          }
        }
      }

      return {
        ...profile,
        email: authUser?.email || 'N/A',
        balance: walletObj ? Number(walletObj.balance) : 0,
        future_receipts: futureReceipts
      };
    }));

    res.json(merged);
  } catch (error: any) {
    console.error('[Users GET] Erro Geral:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/create — Cadastrar novo funcionário de forma integrada
router.post('/create', async (req, res) => {
  try {
    const { email, password, full_name, role, store_id, phone, investor_profile } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'E-mail, senha e nome completo são obrigatórios.' });
    }

    console.log(`[Users API] Criando conta no Auth para: ${email}`);

    // 1. Criar no Supabase Auth com o Admin SDK (confirmação imediata)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role }
    });

    if (authError) {
      console.error('[Users API] Erro ao criar no Auth:', authError);
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;
    console.log(`[Users API] Conta Auth criada com ID: ${userId}. Criando perfil...`);

    // 2. Criar ou Atualizar no Profiles do Banco de Dados
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name,
        role: role || 'attendant',
        store_id: store_id || null,
        phone: phone || null,
        investor_profile: investor_profile || null,
        active: true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profError) {
      console.error('[Users API] Erro ao criar perfil:', profError);
      // Remove o usuário no Auth se der erro no perfil para não ter inconsistências
      await supabase.auth.admin.deleteUser(userId).catch(err => console.error('[Cleanup Error]:', err));
      return res.status(400).json({ error: profError.message });
    }

    res.status(201).json({
      success: true,
      user: {
        ...profile,
        email
      }
    });
  } catch (error: any) {
    console.error('[Users CREATE] Erro Geral:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/:id — Atualizar dados do colaborador
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role, store_id, active, email, password, avatar_url, phone, investor_profile } = req.body;

    console.log(`[Users API] Atualizando usuário: ${id}`);

    // 1. Atualizar tabela de perfis
    const updateFields: any = {
      updated_at: new Date().toISOString()
    };
    if (full_name !== undefined) updateFields.full_name = full_name;
    if (role !== undefined) updateFields.role = role;
    if (store_id !== undefined) updateFields.store_id = store_id || null;
    if (active !== undefined) updateFields.active = active;
    if (avatar_url !== undefined) updateFields.avatar_url = avatar_url;
    if (phone !== undefined) updateFields.phone = phone;
    if (investor_profile !== undefined) updateFields.investor_profile = investor_profile || null;

    const { error: profError } = await supabase
      .from('profiles')
      .update(updateFields)
      .eq('id', id);

    if (profError) {
      console.error('[Users API] Erro ao atualizar perfil:', profError);
      return res.status(400).json({ error: profError.message });
    }

    // 2. Atualizar Auth se alterado E-mail ou Senha
    const updateData: any = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;

    if (Object.keys(updateData).length > 0) {
      const { error: authError } = await supabase.auth.admin.updateUserById(id, updateData);
      if (authError) {
        console.error('[Users API] Erro ao atualizar Auth:', authError);
        return res.status(400).json({ error: authError.message });
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Users UPDATE] Erro Geral:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/users/:id — Excluir conta do funcionário
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`[Users API] Removendo conta e perfil do ID: ${id}`);

    // Verificar se o usuário possui cotas, dispositivos no SCP ou compras de recebíveis vinculados
    const { count: quotasCount } = await supabase
      .from('investor_quotas')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', id);

    const { count: devicesCount } = await supabase
      .from('devices')
      .select('id', { count: 'exact', head: true })
      .eq('investor_id', id);

    const { count: purchasesCount } = await supabase
      .from('receivable_purchases')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', id);

    if ((quotasCount || 0) > 0 || (devicesCount || 0) > 0 || (purchasesCount || 0) > 0) {
      return res.status(400).json({
        error: 'Este investidor possui cotas de lotes, celulares Prime ou recebíveis vinculados no SCP. Remova todos os vínculos antes de excluí-lo.'
      });
    }

    // Remover registros associados do SCP para evitar erro de chave estrangeira
    await supabase.from("withdrawal_requests").delete().eq("profile_id", id);
    await supabase.from("wallet_transactions").delete().eq("profile_id", id);
    await supabase.from("wallets").delete().eq("profile_id", id);
    await supabase.from("scp_audit_logs").delete().eq("user_id", id);

    // Remover da Auth deleta automaticamente o perfil da tabela "profiles" em cascata (ON DELETE CASCADE)
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) {
      console.error('[Users API] Erro ao excluir no Auth:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Users DELETE] Erro Geral:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/verify-password — Verificar senha de um colaborador específico
router.post('/verify-password', async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ error: 'ID do usuário e senha são obrigatórios.' });
    }

    // 1. Buscar o e-mail do usuário no Auth utilizando o Admin SDK
    const { data: userObj, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userObj || !userObj.user?.email) {
      console.error('[VerifyPassword] Erro ao buscar usuário do Auth:', userError);
      return res.status(404).json({ error: 'Colaborador não encontrado.' });
    }

    const email = userObj.user.email;

    // 2. Criar cliente temporário com a Anon Key para testar o login do usuário
    const tempClient = createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.VITE_SUPABASE_ANON_KEY || ''
    );

    const { error: authError } = await tempClient.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.warn('[VerifyPassword] Senha incorreta para:', email, authError.message);
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    res.json({ success: true, userId });
  } catch (error: any) {
    console.error('[VerifyPassword] Erro Geral:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/verify-admin-password — Verificar se a senha corresponde a qualquer administrador
router.post('/verify-admin-password', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Senha é obrigatória.' });
    }

    // 1. Buscar todos os perfis com role = 'admin'
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    if (adminError || !admins || admins.length === 0) {
      return res.status(404).json({ error: 'Nenhum administrador cadastrado.' });
    }

    // 2. Tentar autenticar com a senha informada para cada admin
    for (const admin of admins) {
      const { data: userObj } = await supabase.auth.admin.getUserById(admin.id);
      if (userObj && userObj.user?.email) {
        const email = userObj.user.email;
        const tempClient = createClient(
          process.env.VITE_SUPABASE_URL || '',
          process.env.VITE_SUPABASE_ANON_KEY || ''
        );

        const { error: authError } = await tempClient.auth.signInWithPassword({
          email,
          password
        });

        if (!authError) {
          // Senha correta para este admin!
          return res.json({ success: true, adminId: admin.id });
        }
      }
    }

    return res.status(401).json({ error: 'Senha do administrador incorreta.' });
  } catch (error: any) {
    console.error('[VerifyAdminPassword] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/goals/:month/:year — Obter metas dos colaboradores para o período
router.get('/goals/:month/:year', async (req, res) => {
  try {
    const { month, year } = req.params;
    const { data: goals, error } = await supabase
      .from('collaborator_goals')
      .select('*')
      .eq('month', parseInt(month))
      .eq('year', parseInt(year));

    if (error) {
      console.error('[Users Goals GET] Erro:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json(goals || []);
  } catch (error: any) {
    console.error('[Users Goals GET] Erro Geral:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/goals — Inserir ou atualizar meta de colaborador
router.post('/goals', async (req, res) => {
  try {
    const { profile_id, month, year, sales_target, os_target } = req.body;
    if (!profile_id || !month || !year) {
      return res.status(400).json({ error: 'profile_id, month e year são obrigatórios.' });
    }

    const { data: goal, error } = await supabase
      .from('collaborator_goals')
      .upsert({
        profile_id,
        month: parseInt(month),
        year: parseInt(year),
        sales_target: parseFloat(sales_target || 0),
        os_target: parseInt(os_target || 0),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'profile_id,month,year'
      })
      .select()
      .single();

    if (error) {
      console.error('[Users Goals POST] Erro:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json(goal);
  } catch (error: any) {
    console.error('[Users Goals POST] Erro Geral:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/2fa/settings — Obter status da autenticação de dois fatores
router.get('/2fa/settings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('automation_settings')
      .select('value')
      .eq('key', 'two_factor_auth_enabled')
      .maybeSingle();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const enabled = data?.value === 'true';
    res.json({ enabled });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/2fa/settings — Alterar status da autenticação de dois fatores
router.post('/2fa/settings', async (req, res) => {
  try {
    const { enabled } = req.body;
    const { data, error } = await supabase
      .from('automation_settings')
      .upsert({
        key: 'two_factor_auth_enabled',
        value: enabled ? 'true' : 'false',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.json({ success: true, enabled: data.value === 'true' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/pre-login — Validar credenciais e iniciar fluxo 2FA se ativo
router.post('/pre-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    // 1. Validar e-mail e senha usando Supabase Auth com um cliente temporário
    const tempClient = createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.VITE_SUPABASE_ANON_KEY || ''
    );

    const { data: authData, error: authError } = await tempClient.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const userId = authData.user.id;

    // 2. Buscar o perfil do colaborador para obter telefone e nome
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', userId)
      .maybeSingle();

    if (profError || !profile) {
      return res.status(404).json({ error: 'Perfil do colaborador não encontrado.' });
    }

    // 3. Verificar se 2FA está habilitado globalmente
    const { data: settings } = await supabase
      .from('automation_settings')
      .select('value')
      .eq('key', 'two_factor_auth_enabled')
      .maybeSingle();

    const twoFactorEnabled = settings?.value === 'true';

    // 4. Se não estiver ativo, permite o login direto
    if (!twoFactorEnabled) {
      return res.json({ twoFactorRequired: false });
    }

    // 5. Se estiver ativo mas o perfil não tiver telefone cadastrado, permite login com aviso (evita lockout)
    if (!profile.phone || !profile.phone.trim()) {
      return res.json({ twoFactorRequired: false, warning: 'missing_phone' });
    }

    // 6. Rate limiting: verificar se um código foi gerado nos últimos 60 segundos
    const { data: existingOtp } = await supabase
      .from('auth_otps')
      .select('created_at')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingOtp) {
      const diff = Date.now() - new Date(existingOtp.created_at).getTime();
      if (diff < 60000) {
        return res.status(429).json({ error: 'Aguarde 60 segundos antes de solicitar um novo código.' });
      }
    }

    // 7. Gerar OTP de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutos de expiração

    // Salvar OTP no banco
    const { error: otpError } = await supabase
      .from('auth_otps')
      .insert({
        email,
        code,
        expires_at: expiresAt,
        attempts: 0
      });

    if (otpError) {
      console.error('[2FA Pre-Login] Erro ao salvar OTP:', otpError);
      return res.status(500).json({ error: 'Falha ao processar código de segurança.' });
    }

    // 8. Buscar canal do WhatsApp conectado
    const { data: channels } = await supabase
      .from('automation_channels')
      .select('instance_name')
      .eq('status', 'connected')
      .limit(1);

    const instanceName = channels && channels.length > 0 ? channels[0].instance_name : 'mdr';

    // 9. Enviar via n8n webhook
    const cleanPhone = profile.phone.replace(/\D/g, '');
    const remoteJid = formatWhatsAppJid(profile.phone);
    const messageText = `*MDR Informática & Celulares* 🔐\n\nOlá, ${profile.full_name}!\nSeu código de segurança para acessar o painel é:\n\n*${code}*\n\nEste código é válido por 5 minutos. Não compartilhe com ninguém.`;

    const n8nUrl = process.env.N8N_2FA_WEBHOOK_URL || `${process.env.N8N_API_URL}/webhook/auth-2fa`;
    console.log(`[2FA Pre-Login] Enviando código para ${cleanPhone} via n8n: ${n8nUrl}`);

    try {
      const response = await fetch(n8nUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': process.env.N8N_API_KEY || ''
        },
        body: JSON.stringify({
          instanceName,
          remoteJid,
          text: messageText,
          phone: cleanPhone,
          code,
          name: profile.full_name
        })
      });

      if (!response.ok) {
        const errTxt = await response.text();
        console.warn('[2FA Pre-Login] Falha no disparo n8n:', errTxt);
      }
    } catch (err) {
      console.error('[2FA Pre-Login] Erro ao chamar webhook n8n:', err);
    }

    res.json({ twoFactorRequired: true, email });
  } catch (error: any) {
    console.error('[Pre-Login] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/verify-otp — Validar o código OTP de 6 dígitos do 2FA
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'E-mail e código de verificação são obrigatórios.' });
    }

    // 1. Buscar OTP pendente
    const { data: otp, error: otpError } = await supabase
      .from('auth_otps')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otp) {
      return res.status(400).json({ error: 'Código de segurança expirado ou inválido. Reinicie o login.' });
    }

    // 2. Verificar expiração
    if (new Date() > new Date(otp.expires_at)) {
      await supabase.from('auth_otps').delete().eq('id', otp.id);
      return res.status(400).json({ error: 'Código de segurança expirado. Solicite outro.' });
    }

    // 3. Verificar limite de tentativas (max 3 erros, ou seja, exclui no 4º erro)
    if (otp.attempts >= 3) {
      await supabase.from('auth_otps').delete().eq('id', otp.id);
      return res.status(400).json({ error: 'Muitas tentativas malsucedidas. Reinicie o login para enviar novo código.' });
    }

    // 4. Comparar o código
    if (otp.code !== code.trim()) {
      // Incrementar tentativas
      const nextAttempts = otp.attempts + 1;
      await supabase
        .from('auth_otps')
        .update({ attempts: nextAttempts })
        .eq('id', otp.id);

      return res.status(400).json({
        error: `Código incorreto. Você tem mais ${4 - nextAttempts} tentativa(s).`
      });
    }

    // 5. Sucesso! Deletar OTP para não reutilizar
    await supabase.from('auth_otps').delete().eq('id', otp.id);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Verify-OTP] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/forgot-password — Solicitar redefinição de senha por WhatsApp
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }

    // 1. Localizar o usuário pelo e-mail usando o Admin SDK
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('[Forgot-Password] Erro ao listar usuários:', listError);
      return res.status(500).json({ error: 'Erro interno ao processar a solicitação.' });
    }

    const targetUser = (users as any[]).find(u => u.email?.toLowerCase() === email.trim().toLowerCase());
    if (!targetUser) {
      return res.status(404).json({ error: 'Nenhuma conta encontrada com este e-mail.' });
    }

    // 2. Buscar o perfil associado para pegar o telefone
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', targetUser.id)
      .maybeSingle();

    if (profError || !profile) {
      return res.status(500).json({ error: 'Erro ao buscar o perfil do colaborador.' });
    }

    if (!profile.phone || !profile.phone.trim()) {
      return res.status(400).json({
        error: 'Esta conta não possui número de telefone cadastrado no perfil. Por favor, solicite a redefinição diretamente ao administrador.'
      });
    }

    // 3. Rate limiting de 60 segundos
    const { data: existingOtp } = await supabase
      .from('auth_otps')
      .select('created_at')
      .eq('email', targetUser.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingOtp) {
      const diff = Date.now() - new Date(existingOtp.created_at).getTime();
      if (diff < 60000) {
        return res.status(429).json({ error: 'Aguarde 60 segundos antes de solicitar um novo código de recuperação.' });
      }
    }

    // 4. Gerar código OTP de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: otpError } = await supabase
      .from('auth_otps')
      .insert({
        email: targetUser.email,
        code,
        expires_at: expiresAt,
        attempts: 0
      });

    if (otpError) {
      console.error('[Forgot-Password] Erro ao gravar OTP:', otpError);
      return res.status(500).json({ error: 'Erro ao gerar token de recuperação.' });
    }

    // 5. Enviar via n8n/Evolution API
    const { data: channels } = await supabase
      .from('automation_channels')
      .select('instance_name')
      .eq('status', 'connected')
      .limit(1);

    const instanceName = channels && channels.length > 0 ? channels[0].instance_name : 'mdr';

    const cleanPhone = profile.phone.replace(/\D/g, '');
    const remoteJid = formatWhatsAppJid(profile.phone);
    const messageText = `*MDR Informática & Celulares* 🔑\n\nOlá, ${profile.full_name}!\nVocê solicitou a recuperação de acesso ao painel administrativo (CRM).\nSeu código de segurança para redefinir sua senha é:\n\n*${code}*\n\nEste código é válido por 5 minutos. Não compartilhe com ninguém.`;

    const n8nUrl = process.env.N8N_2FA_WEBHOOK_URL || `${process.env.N8N_API_URL}/webhook/auth-2fa`;

    try {
      const response = await fetch(n8nUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': process.env.N8N_API_KEY || ''
        },
        body: JSON.stringify({
          instanceName,
          remoteJid,
          text: messageText,
          phone: cleanPhone,
          code,
          name: profile.full_name
        })
      });

      if (!response.ok) {
        const errTxt = await response.text();
        console.warn('[Forgot-Password] Falha no envio n8n:', errTxt);
      }
    } catch (err) {
      console.error('[Forgot-Password] Erro ao acionar webhook n8n:', err);
    }

    res.json({ success: true, email: targetUser.email });
  } catch (error: any) {
    console.error('[Forgot-Password] Erro Geral:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/reset-password — Redefinir a senha após validar o código OTP
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'E-mail, código e nova senha são obrigatórios.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    // 1. Buscar OTP
    const { data: otp, error: otpError } = await supabase
      .from('auth_otps')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otp) {
      return res.status(400).json({ error: 'Código de recuperação expirado ou inválido. Reinicie o fluxo.' });
    }

    // 2. Validar expiração
    if (new Date() > new Date(otp.expires_at)) {
      await supabase.from('auth_otps').delete().eq('id', otp.id);
      return res.status(400).json({ error: 'Código de recuperação expirado. Solicite outro.' });
    }

    // 3. Validar tentativas
    if (otp.attempts >= 3) {
      await supabase.from('auth_otps').delete().eq('id', otp.id);
      return res.status(400).json({ error: 'Muitas tentativas incorretas. Solicite um novo código.' });
    }

    // 4. Comparar o código
    if (otp.code !== code.trim()) {
      const nextAttempts = otp.attempts + 1;
      await supabase
        .from('auth_otps')
        .update({ attempts: nextAttempts })
        .eq('id', otp.id);

      return res.status(400).json({
        error: `Código incorreto. Você tem mais ${4 - nextAttempts} tentativa(s).`
      });
    }

    // 5. Obter o UUID do usuário para atualizar a senha
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      return res.status(500).json({ error: 'Erro ao processar alteração da senha.' });
    }

    const targetUser = (users as any[]).find(u => u.email?.toLowerCase() === email.trim().toLowerCase());
    if (!targetUser) {
      return res.status(404).json({ error: 'Usuário não encontrado para redefinir senha.' });
    }

    // 6. Atualizar a senha da conta no Supabase Auth usando o Admin SDK
    const { error: updateError } = await supabase.auth.admin.updateUserById(targetUser.id, {
      password: newPassword
    });

    if (updateError) {
      console.error('[Reset-Password] Erro ao atualizar no Auth:', updateError);
      return res.status(400).json({ error: `Erro ao redefinir: ${updateError.message}` });
    }

    // 7. Limpar o OTP usado
    await supabase.from('auth_otps').delete().eq('id', otp.id);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Reset-Password] Erro Geral:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
