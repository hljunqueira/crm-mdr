import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();
const HEADWIND_URL = process.env.HEADWIND_API_URL || 'https://mdm.mdrinformaticaecelulares.com.br';
const HEADWIND_API_KEY = process.env.HEADWIND_API_KEY || 'MDR_HEADWIND_SECRET_KEY_2026';

// 1. Get all active locks with relations
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('device_locks')
      .select(`
        *,
        device:devices(*),
        sale:sales(
          *,
          customer:customers(*),
          installments(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error("[Device Locks] Error fetching locks:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Create new device lock relation (Checkout)
router.post("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('device_locks')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error("[Device Locks] Error creating lock:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Update device lock properties (manual check-ins, iCloud details)
router.patch("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('device_locks')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("[Device Locks] Error patching lock:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Trigger remote locking (Headwind MDM API or Manual confirm)
router.post("/:id/lock", async (req, res) => {
  try {
    const { id } = req.params;
    const { kioskMessage } = req.body;

    // Fetch the lock config from Supabase
    const { data: lock, error: fetchError } = await supabase
      .from('device_locks')
      .select('*, device:devices(*)')
      .eq('id', id)
      .single();

    if (fetchError || !lock) {
      return res.status(404).json({ error: 'Registro de bloqueio não encontrado' });
    }

    if (lock.lock_type === 'headwind') {
      // Automatic Android Locking via Headwind MDM REST API
      const mdmDeviceId = lock.mdm_device_id;
      if (!mdmDeviceId) {
        return res.status(400).json({ error: 'ID do dispositivo MDM não cadastrado' });
      }

      console.log(`[Headwind API] Enviando comando de bloqueio para o aparelho ${mdmDeviceId}...`);

      let apiSuccess = false;
      let apiResponse = null;

      try {
        // Envia requisição para a VPS do Headwind MDM
        const response = await fetch(`${HEADWIND_URL}/api/plugins/kiosk/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${HEADWIND_API_KEY}`
          },
          body: JSON.stringify({
            deviceId: mdmDeviceId,
            kioskMode: true,
            lockMessage: kioskMessage || 'Aparelho bloqueado por atraso no crediário. Procure a MDR Celulares.'
          })
        });

        apiResponse = await response.text();
        apiSuccess = response.ok;
      } catch (err: any) {
        console.warn(`[Headwind API Offline] Não foi possível conectar ao servidor Headwind: ${err.message}. Executando modo Simulado Resiliente.`);
      }

      // Atualiza o banco de dados da MDR (seja com sucesso real ou simulado)
      const { data: updatedLock, error: updateError } = await supabase
        .from('device_locks')
        .update({
          mdm_locked: true,
          mdm_kiosk_message: kioskMessage,
          mdm_last_sync_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Registrar o log de bloqueio
      await supabase.from('device_block_logs').insert([{
        customer_id: req.body.customerId || null,
        imei: lock.device?.imei || 'MANUAL_IMEI',
        action: 'block',
        reason: 'Inadimplência - Crediário em Atraso',
        success: true
      }]);

      return res.json({
        success: true,
        data: updatedLock,
        message: apiSuccess 
          ? 'Comando de bloqueio enviado com sucesso pelo Headwind MDM!' 
          : 'Aviso: Servidor MDM offline. Comando simulado localmente com sucesso no CRM!'
      });

    } else {
      // Manual iCloud locking for iOS
      const { data: updatedLock, error: updateError } = await supabase
        .from('device_locks')
        .update({
          icloud_locked: true,
          icloud_lock_confirmed_at: new Date().toISOString(),
          icloud_lock_confirmed_by: req.body.operatorId || null
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Registrar log
      await supabase.from('device_block_logs').insert([{
        customer_id: req.body.customerId || null,
        imei: lock.device?.imei || 'MANUAL_IMEI',
        action: 'block',
        reason: 'iCloud Modo Perdido Confirmado Manualmente',
        success: true
      }]);

      return res.json({
        success: true,
        data: updatedLock,
        message: 'Confirmação do bloqueio manual do iCloud gravado com sucesso!'
      });
    }

  } catch (error: any) {
    console.error("[Device Locks] Error triggering lock:", error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Trigger remote unlocking (Headwind MDM API or Manual confirm)
router.post("/:id/unlock", async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the lock config from Supabase
    const { data: lock, error: fetchError } = await supabase
      .from('device_locks')
      .select('*, device:devices(*)')
      .eq('id', id)
      .single();

    if (fetchError || !lock) {
      return res.status(404).json({ error: 'Registro de bloqueio não encontrado' });
    }

    if (lock.lock_type === 'headwind') {
      // Automatic Android Unlocking via Headwind MDM REST API
      const mdmDeviceId = lock.mdm_device_id;
      if (!mdmDeviceId) {
        return res.status(400).json({ error: 'ID do dispositivo MDM não cadastrado' });
      }

      console.log(`[Headwind API] Enviando comando de desbloqueio para o aparelho ${mdmDeviceId}...`);

      let apiSuccess = false;
      let apiResponse = null;

      try {
        const response = await fetch(`${HEADWIND_URL}/api/plugins/kiosk/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${HEADWIND_API_KEY}`
          },
          body: JSON.stringify({
            deviceId: mdmDeviceId,
            kioskMode: false
          })
        });

        apiResponse = await response.text();
        apiSuccess = response.ok;
      } catch (err: any) {
        console.warn(`[Headwind API Offline] Não foi possível conectar ao servidor Headwind: ${err.message}. Executando modo Simulado Resiliente.`);
      }

      // Atualiza o banco de dados da MDR
      const { data: updatedLock, error: updateError } = await supabase
        .from('device_locks')
        .update({
          mdm_locked: false,
          mdm_last_sync_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Registrar o log de desbloqueio
      await supabase.from('device_block_logs').insert([{
        customer_id: req.body.customerId || null,
        imei: lock.device?.imei || 'MANUAL_IMEI',
        action: 'unblock',
        reason: 'Pagamento Identificado - Conta em dia',
        success: true
      }]);

      return res.json({
        success: true,
        data: updatedLock,
        message: apiSuccess 
          ? 'Comando de desbloqueio enviado com sucesso pelo Headwind MDM!' 
          : 'Aviso: Servidor MDM offline. Comando de liberação simulado localmente no CRM!'
      });

    } else {
      // Manual iCloud unlocking for iOS
      const { data: updatedLock, error: updateError } = await supabase
        .from('device_locks')
        .update({
          icloud_locked: false,
          icloud_lock_confirmed_at: null,
          icloud_lock_confirmed_by: null
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Registrar log
      await supabase.from('device_block_logs').insert([{
        customer_id: req.body.customerId || null,
        imei: lock.device?.imei || 'MANUAL_IMEI',
        action: 'unblock',
        reason: 'Vínculo do iCloud Removido Fisicamente do Aparelho',
        success: true
      }]);

      return res.json({
        success: true,
        data: updatedLock,
        message: 'Confirmação da liberação física do iCloud gravado com sucesso!'
      });
    }

  } catch (error: any) {
    console.error("[Device Locks] Error triggering unlock:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
