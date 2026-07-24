import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { google } from "googleapis";
import path from "path";
import { db } from "../db/connection.js";
import { deviceLocks, deviceBlockLogs, automationSettings } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// Helper to get AMAPI client
function getAmapiClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), "docs", "crm-mdr-7bd29f5d4741.json"),
    scopes: ["https://www.googleapis.com/auth/androidmanagement"],
  });
  return google.androidmanagement({ version: "v1", auth });
}

const useSupabase = (req: any) => {
  const host = req.headers.host || '';
  return host.includes('mdrinformaticaecelulares.com.br') || 
         process.env.IS_VPS === 'true' || 
         (!host.includes('localhost') && !host.includes('127.0.0.1'));
};

function snakeToCamel(str: string): string {
  return str.replace(/([-_][a-z])/g, group =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function mapLocalToCloud(tableName: string, data: any): any {
  const result: any = {};
  for (const k of Object.keys(data)) {
    let pgKey = camelToSnake(k);
    if (k === 'deviceId') pgKey = 'device_id';
    else if (k === 'saleId') pgKey = 'sale_id';
    else if (k === 'customerId') pgKey = 'customer_id';
    else if (k === 'lockType') pgKey = 'lock_type';
    else if (k === 'mdmDeviceId') pgKey = 'mdm_device_id';
    else if (k === 'mdmLocked') pgKey = 'mdm_locked';
    else if (k === 'mdmLastSyncAt') pgKey = 'mdm_last_sync_at';
    else if (k === 'mdmKioskMessage') pgKey = 'mdm_kiosk_message';
    else if (k === 'icloudEmail') pgKey = 'icloud_email';
    else if (k === 'icloudPassword') pgKey = 'icloud_password';
    else if (k === 'icloudLocked') pgKey = 'icloud_locked';
    else if (k === 'icloudLockConfirmedAt') pgKey = 'icloud_lock_confirmed_at';
    else if (k === 'icloudLockConfirmedBy') pgKey = 'icloud_lock_confirmed_by';
    result[pgKey] = data[k];
  }
  return result;
}

// GET /enterprise
router.get("/enterprise", async (req, res) => {
  if (useSupabase(req)) {
    try {
      const { data, error } = await supabase
        .from("automation_settings")
        .select("value")
        .eq("key", "google_enterprise_id")
        .maybeSingle();

      if (error) throw error;
      return res.json({ enterpriseId: data?.value || null });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // SQLite fallback
  try {
    const [setting] = await db.select().from(automationSettings).where(eq(automationSettings.key, "google_enterprise_id")).limit(1);
    res.json({ enterpriseId: setting?.value || null });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /enterprise/signup-url
router.post("/enterprise/signup-url", async (req, res) => {
  if (!useSupabase(req)) {
    return res.status(400).json({ error: "O cadastro do Android Enterprise requer conexão de rede." });
  }

  try {
    const amapi = getAmapiClient();
    const callbackUrl = req.body.callbackUrl || "https://mdrinformaticaecelulares.com.br/api/device-locks/callback";
    
    const signup = await amapi.signupUrls.create({
      projectId: "crm-mdr",
      callbackUrl: callbackUrl
    });

    await supabase
      .from("automation_settings")
      .upsert(
        { key: "google_signup_url_name", value: signup.data.name, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

    res.json({
      url: signup.data.url,
      name: signup.data.name
    });
  } catch (error: any) {
    console.error("[Device Locks] Error generating signup URL:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /callback
router.get("/callback", async (req, res) => {
  try {
    let { enterpriseToken, signupUrlName } = req.query;
    if (!enterpriseToken) {
      return res.status(400).send("<h1>Erro: Token do Enterprise ausente.</h1>");
    }

    if (useSupabase(req)) {
      if (!signupUrlName) {
        const { data } = await supabase.from("automation_settings").select("value").eq("key", "google_signup_url_name").maybeSingle();
        if (data?.value) signupUrlName = data.value;
      }

      if (!signupUrlName) {
        return res.status(400).send("<h1>Erro: Nome da URL de inscrição ausente.</h1>");
      }

      const amapi = getAmapiClient();
      const enterprise = await amapi.enterprises.create({
        enterpriseToken: enterpriseToken as string,
        signupUrlName: signupUrlName as string,
        projectId: "crm-mdr",
        requestBody: {}
      });

      const enterpriseId = enterprise.data.name;

      await supabase
        .from("automation_settings")
        .upsert(
          { key: "google_enterprise_id", value: enterpriseId, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );

      return res.send(`<h1>Vinculado com Sucesso! Badge: ${enterpriseId}</h1>`);
    }

    res.status(400).send("<h1>Erro: Callback do Android Enterprise não é suportado offline.</h1>");
  } catch (error: any) {
    res.status(500).send(`<h1>Erro ao vincular conta:</h1><p>${error.message}</p>`);
  }
});

// DELETE /enterprise
router.delete("/enterprise", async (req, res) => {
  if (useSupabase(req)) {
    try {
      const { error } = await supabase.from("automation_settings").delete().eq("key", "google_enterprise_id");
      if (error) throw error;
      return res.json({ success: true, message: "Removido com sucesso." });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // SQLite fallback
  try {
    await db.delete(automationSettings).where(eq(automationSettings.key, "google_enterprise_id"));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /enterprise/enrollment-token
router.post("/enterprise/enrollment-token", async (req, res) => {
  if (!useSupabase(req)) {
    return res.status(400).json({ error: "Gerar token de inscrição requer conexão de rede." });
  }

  try {
    const { data: setting, error: dbError } = await supabase
      .from("automation_settings")
      .select("value")
      .eq("key", "google_enterprise_id")
      .maybeSingle();

    if (dbError || !setting?.value) {
      return res.status(400).json({ error: "Google Enterprise ID não configurado no sistema." });
    }

    const enterpriseId = setting.value;
    const amapi = getAmapiClient();

    const tokenResponse = await amapi.enterprises.enrollmentTokens.create({
      parent: enterpriseId,
      requestBody: {
        duration: "2592000s",
        policyName: "default"
      }
    });

    const token = tokenResponse.data.value;

    const qrCodePayload = JSON.stringify({
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.google.android.apps.work.clouddpc/.Receiver",
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM": "I5YvS0O5hXY46mb01WiRCE2o15935",
      "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": "https://play.google.com/otacg/download/CloudDpcCommandLine_20170425_00.apk",
      "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
        "com.google.android.apps.work.clouddpc.EXTRA_ENROLLMENT_TOKEN": token
      }
    });

    res.json({
      token: token,
      qrCodePayload: qrCodePayload,
      expiration: (tokenResponse.data as any).expirationTime || null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET device_locks
router.get("/", async (req, res) => {
  if (useSupabase(req)) {
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
      return res.json(data || []);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // SQLite fallback
  try {
    const list = await db.select().from(deviceLocks).orderBy(desc(deviceLocks.createdAt));
    const formatted = list.map(l => ({
      id: l.id,
      device_id: l.deviceId,
      sale_id: l.saleId,
      lock_type: l.lockType,
      mdm_device_id: l.mdmDeviceId,
      mdm_locked: l.mdmLocked,
      mdm_last_sync_at: l.mdmLastSyncAt,
      mdm_kiosk_message: l.mdmKioskMessage,
      icloud_email: l.icloudEmail,
      icloud_password: l.icloudPassword,
      icloud_locked: l.icloudLocked,
      icloud_lock_confirmed_at: l.icloudLockConfirmedAt,
      icloud_lock_confirmed_by: l.icloudLockConfirmedBy,
      created_at: l.createdAt
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST device_locks
router.post("/", async (req, res) => {
  if (useSupabase(req)) {
    try {
      const { data, error } = await supabase
        .from('device_locks')
        .insert([req.body])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // SQLite fallback
  try {
    const id = req.body.id || crypto.randomUUID();
    const newLock: any = {
      id,
      syncStatus: 'pending_insert',
      updatedAt: new Date().toISOString()
    };
    for (const key of Object.keys(req.body)) {
      newLock[snakeToCamel(key)] = req.body[key];
    }

    await db.insert(deviceLocks).values(newLock);

    const pgPayload = mapLocalToCloud('device_locks', newLock);
    // syncQueue insert removed (Supabase native mode)

    res.status(201).json(pgPayload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH device_locks
router.patch("/:id", async (req, res) => {
  if (useSupabase(req)) {
    try {
      const { data, error } = await supabase
        .from('device_locks')
        .update(req.body)
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) throw error;
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // SQLite fallback
  try {
    const updateData: any = {};
    for (const key of Object.keys(req.body)) {
      updateData[snakeToCamel(key)] = req.body[key];
    }
    updateData.syncStatus = 'pending_update';
    updateData.updatedAt = new Date().toISOString();

    await db.update(deviceLocks).set(updateData).where(eq(deviceLocks.id, req.params.id));

    const [updatedLock] = await db.select().from(deviceLocks).where(eq(deviceLocks.id, req.params.id)).limit(1);
    if (!updatedLock) return res.status(404).json({ error: "Bloqueio não encontrado" });

    const pgPayload = mapLocalToCloud('device_locks', updatedLock);
    // syncQueue insert removed (Supabase native mode)

    res.json(pgPayload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger remote locking
router.post("/:id/lock", async (req, res) => {
  if (useSupabase(req)) {
    try {
      const { id } = req.params;
      const { kioskMessage } = req.body;

      const { data: lock, error: fetchError } = await supabase
        .from('device_locks')
        .select('*, device:devices(*)')
        .eq('id', id)
        .single();

      if (fetchError || !lock) return res.status(404).json({ error: 'Registro de bloqueio não encontrado' });

      if (lock.lock_type === 'android') {
        const { data: updatedLock, error: updateError } = await supabase
          .from('device_locks')
          .update({
            mdm_locked: true,
            mdm_last_sync_at: new Date().toISOString(),
            mdm_kiosk_message: kioskMessage || 'Aparelho bloqueado por atraso no crediário.'
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        await supabase.from('device_block_logs').insert([{
          customer_id: req.body.customerId || null,
          imei: lock.device?.imei || 'MANUAL_IMEI',
          action: 'block',
          reason: 'Bloqueio do Google Device Lock Controller Confirmado Manualmente',
          success: true
        }]);

        return res.json({ success: true, data: updatedLock });
      } else {
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

        await supabase.from('device_block_logs').insert([{
          customer_id: req.body.customerId || null,
          imei: lock.device?.imei || 'MANUAL_IMEI',
          action: 'block',
          reason: 'iCloud Modo Perdido Confirmado Manualmente',
          success: true
        }]);

        return res.json({ success: true, data: updatedLock });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // SQLite fallback
  try {
    const { id } = req.params;
    const { kioskMessage } = req.body;

    const [lock] = await db.select().from(deviceLocks).where(eq(deviceLocks.id, id)).limit(1);
    if (!lock) return res.status(404).json({ error: 'Registro de bloqueio não encontrado' });

    let updatedLock;
    if (lock.lockType === 'android') {
      await db.update(deviceLocks)
        .set({
          mdmLocked: true,
          mdmLastSyncAt: new Date().toISOString(),
          mdmKioskMessage: kioskMessage || 'Aparelho bloqueado por atraso no crediário.',
          syncStatus: 'pending_update',
          updatedAt: new Date().toISOString()
        })
        .where(eq(deviceLocks.id, id));

      const [updated] = await db.select().from(deviceLocks).where(eq(deviceLocks.id, id)).limit(1);
      updatedLock = mapLocalToCloud('device_locks', updated);

      // syncQueue insert removed (Supabase native mode)
    } else {
      await db.update(deviceLocks)
        .set({
          icloudLocked: true,
          icloudLockConfirmedAt: new Date().toISOString(),
          icloudLockConfirmedBy: req.body.operatorId || null,
          syncStatus: 'pending_update',
          updatedAt: new Date().toISOString()
        })
        .where(eq(deviceLocks.id, id));

      const [updated] = await db.select().from(deviceLocks).where(eq(deviceLocks.id, id)).limit(1);
      updatedLock = mapLocalToCloud('device_locks', updated);

      // syncQueue insert removed (Supabase native mode)
    }

    res.json({ success: true, data: updatedLock });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger remote unlocking
router.post("/:id/unlock", async (req, res) => {
  if (useSupabase(req)) {
    try {
      const { id } = req.params;

      const { data: lock, error: fetchError } = await supabase
        .from('device_locks')
        .select('*, device:devices(*)')
        .eq('id', id)
        .single();

      if (fetchError || !lock) return res.status(404).json({ error: 'Registro de bloqueio não encontrado' });

      if (lock.lock_type === 'android') {
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

        await supabase.from('device_block_logs').insert([{
          customer_id: req.body.customerId || null,
          imei: lock.device?.imei || 'MANUAL_IMEI',
          action: 'unblock',
          reason: 'Desbloqueio do Google Device Lock Controller Confirmado Manualmente',
          success: true
        }]);

        return res.json({ success: true, data: updatedLock });
      } else {
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

        await supabase.from('device_block_logs').insert([{
          customer_id: req.body.customerId || null,
          imei: lock.device?.imei || 'MANUAL_IMEI',
          action: 'unblock',
          reason: 'Vínculo do iCloud Removido Fisicamente do Aparelho',
          success: true
        }]);

        return res.json({ success: true, data: updatedLock });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // SQLite fallback
  try {
    const { id } = req.params;

    const [lock] = await db.select().from(deviceLocks).where(eq(deviceLocks.id, id)).limit(1);
    if (!lock) return res.status(404).json({ error: 'Registro de bloqueio não encontrado' });

    let updatedLock;
    if (lock.lockType === 'android') {
      await db.update(deviceLocks)
        .set({
          mdmLocked: false,
          mdmLastSyncAt: new Date().toISOString(),
          syncStatus: 'pending_update',
          updatedAt: new Date().toISOString()
        })
        .where(eq(deviceLocks.id, id));

      const [updated] = await db.select().from(deviceLocks).where(eq(deviceLocks.id, id)).limit(1);
      updatedLock = mapLocalToCloud('device_locks', updated);

      // syncQueue insert removed (Supabase native mode)
    } else {
      await db.update(deviceLocks)
        .set({
          icloudLocked: false,
          icloudLockConfirmedAt: null,
          icloudLockConfirmedBy: null,
          syncStatus: 'pending_update',
          updatedAt: new Date().toISOString()
        })
        .where(eq(deviceLocks.id, id));

      const [updated] = await db.select().from(deviceLocks).where(eq(deviceLocks.id, id)).limit(1);
      updatedLock = mapLocalToCloud('device_locks', updated);

      // syncQueue insert removed (Supabase native mode)
    }

    res.json({ success: true, data: updatedLock });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
