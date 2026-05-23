import { Router } from 'express';
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
    const { full_name, role, store_id, active, email, password } = req.body;

    console.log(`[Users API] Atualizando usuário: ${id}`);

    // 1. Atualizar tabela de perfis
    const { error: profError } = await supabase
      .from('profiles')
      .update({
        full_name,
        role,
        store_id: store_id || null,
        active: active !== undefined ? active : true,
        updated_at: new Date().toISOString()
      })
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

export default router;
