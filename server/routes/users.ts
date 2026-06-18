import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase.js';

const router = Router();

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

    // 3. Mesclar e-mails
    const merged = profiles.map(profile => {
      const authUser = authUsers.find(u => u.id === profile.id);
      return {
        ...profile,
        email: authUser?.email || 'N/A'
      };
    });

    res.json(merged);
  } catch (error: any) {
    console.error('[Users GET] Erro Geral:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/create — Cadastrar novo funcionário de forma integrada
router.post('/create', async (req, res) => {
  try {
    const { email, password, full_name, role, store_id } = req.body;

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
    const { full_name, role, store_id, active, email, password, avatar_url, phone } = req.body;

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

export default router;
