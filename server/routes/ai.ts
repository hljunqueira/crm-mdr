import { Router } from 'express';
import Groq from 'groq-sdk';
import { supabase } from '../lib/supabase.js';

const router = Router();

const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const EVOLUTION_API_KEY = 'MDR_SECRET_TOKEN_2024';

// ── Groq Client ──────────────────────────────────────────────────────────────
function createGroqClient(apiKey: string) {
  return new Groq({ apiKey });
}

// ── Gerar resposta da IA ─────────────────────────────────────────────────────
export async function generateAIResponse(
  channelId: string,
  userMessage: string,
  contactName: string
): Promise<string | null> {
  try {
    // 1. Buscar configurações de IA para o canal
    const { data: settings, error } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('channel_id', channelId)
      .eq('enabled', true)
      .maybeSingle();

    if (error || !settings) {
      console.log(`[AI] IA desabilitada ou sem configuração para canal ${channelId}`);
      return null;
    }

    // 2. Determinar a API key a usar
    const apiKey = settings.api_key || process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('[AI] Nenhuma API key configurada para IA');
      return null;
    }

    // 3. Buscar contexto: últimas 10 mensagens da conversa para dar contexto
    const systemPrompt = settings.system_prompt || 
      'Você é um atendente virtual da MDR Informática e Celulares. Responda de forma educada, objetiva e profissional. Ajude com dúvidas sobre produtos, preços, prazos e serviços.';

    const maxTokens = settings.max_tokens || 500;

    // 4. Chamar Groq API
    const groq = createGroqClient(apiKey);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `${systemPrompt}\n\nO nome do cliente é: ${contactName}. Responda sempre em Português do Brasil. Seja cordial e use emojis quando apropriado para tornar a conversa mais amigável. Não invente informações sobre preços ou produtos específicos a menos que estejam no seu contexto.`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: maxTokens,
      top_p: 1,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      console.warn('[AI] Resposta vazia da Groq');
      return null;
    }

    console.log(`[AI] Resposta gerada com sucesso (${aiResponse.length} chars)`);
    return aiResponse;

  } catch (error: any) {
    console.error('[AI] Erro ao gerar resposta:', error?.message || error);
    return null;
  }
}

// ── Enviar resposta da IA via Evolution API ──────────────────────────────────
export async function sendAIResponseViaEvolution(
  instanceName: string,
  remoteJid: string,
  text: string
): Promise<boolean> {
  try {
    const url = `${EVOLUTION_URL}/message/sendText/${instanceName}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: remoteJid,
        text: text,
        linkPreview: false
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[AI] Falha ao enviar via Evolution: ${response.status}`, errorData);
      return false;
    }

    console.log(`[AI] Resposta enviada com sucesso para ${remoteJid}`);
    return true;
  } catch (error: any) {
    console.error('[AI] Erro ao enviar via Evolution:', error?.message || error);
    return false;
  }
}

// ── Processar mensagem inbound com IA (chamada pelo webhook) ─────────────────
export async function processInboundWithAI(
  channelId: string,
  instanceName: string,
  conversationId: string,
  remoteJid: string,
  contactName: string,
  userMessage: string
): Promise<void> {
  try {
    // 1. Gerar resposta
    const aiResponse = await generateAIResponse(channelId, userMessage, contactName);
    
    if (!aiResponse) return; // IA desabilitada ou falhou

    // 2. Salvar resposta da IA no banco
    const { error: msgErr } = await supabase
      .from('messages')
      .insert([{
        conversation_id: conversationId,
        text: aiResponse,
        direction: 'outbound',
        status: 'sent',
        type: 'text',
        sender_id: 'ai',
        created_at: new Date().toISOString()
      }]);

    if (msgErr) {
      console.error('[AI] Erro ao salvar mensagem da IA:', msgErr);
      return;
    }

    // 3. Atualizar conversa com última mensagem
    await supabase
      .from('conversations')
      .update({
        last_message: aiResponse,
        last_message_at: new Date().toISOString(),
        unread_count: 0
      })
      .eq('id', conversationId);

    // 4. Enviar via Evolution API
    await sendAIResponseViaEvolution(instanceName, remoteJid, aiResponse);

  } catch (error) {
    console.error('[AI] Erro no processamento de IA:', error);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REST API Endpoints para gerenciar configurações de IA
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/ai/settings/:channelId — Buscar configuração de IA para um canal
router.get('/settings/:channelId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('channel_id', req.params.channelId)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    
    // Se não existe configuração, retornar template padrão
    if (!data) {
      return res.json({
        channel_id: req.params.channelId,
        enabled: false,
        provider: 'groq',
        api_key: '',
        system_prompt: 'Você é um atendente virtual da MDR Informática e Celulares. Responda de forma educada, objetiva e profissional. Ajude com dúvidas sobre produtos, preços, prazos e serviços.',
        max_tokens: 500
      });
    }

    // Mascarar a API key parcialmente para segurança
    if (data.api_key) {
      data.api_key = data.api_key.substring(0, 8) + '...' + data.api_key.substring(data.api_key.length - 4);
    }

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/ai/settings/:channelId — Criar ou atualizar configuração de IA
router.put('/settings/:channelId', async (req, res) => {
  try {
    const channelId = req.params.channelId;
    const { enabled, provider, api_key, system_prompt, max_tokens } = req.body;

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('ai_settings')
      .select('id')
      .eq('channel_id', channelId)
      .maybeSingle();

    const settingsData: any = {
      channel_id: channelId,
      enabled: enabled ?? false,
      provider: provider || 'groq',
      system_prompt: system_prompt !== undefined ? (system_prompt === '' ? null : system_prompt) : undefined,
      max_tokens: max_tokens || 500,
      updated_at: new Date().toISOString()
    };

    // Só atualizar api_key se foi enviada uma nova (não mascarada)
    if (api_key !== undefined && !api_key.includes('...')) {
      settingsData.api_key = api_key === '' ? null : api_key;
    }

    let result;
    if (existing) {
      result = await supabase
        .from('ai_settings')
        .update(settingsData)
        .eq('channel_id', channelId)
        .select()
        .single();
    } else {
      result = await supabase
        .from('ai_settings')
        .insert([settingsData])
        .select()
        .single();
    }

    if (result.error) return res.status(500).json({ error: result.error.message });
    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/test — Testar resposta da IA (para preview no painel)
router.post('/test', async (req, res) => {
  try {
    const { message, system_prompt, api_key } = req.body;

    const key = api_key || process.env.GROQ_API_KEY;
    if (!key) {
      return res.status(400).json({ error: 'Nenhuma API key fornecida' });
    }

    const groq = createGroqClient(key);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: system_prompt || 'Você é um atendente virtual. Responda em Português do Brasil.'
        },
        { role: 'user', content: message || 'Olá, quais são os serviços disponíveis?' }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Sem resposta';
    res.json({ response: aiResponse });
  } catch (error: any) {
    console.error('[AI Test] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
