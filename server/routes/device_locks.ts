import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();


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
      return res.status(400).json({ error: 'O serviço de MDM Android (Headwind) foi desativado.' });
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
      return res.status(400).json({ error: 'O serviço de MDM Android (Headwind) foi desativado.' });
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
