import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { google } from "googleapis";
import path from "path";

const router = Router();

// Helper to get AMAPI client
function getAmapiClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), "docs", "crm-mdr-7bd29f5d4741.json"),
    scopes: ["https://www.googleapis.com/auth/androidmanagement"],
  });
  return google.androidmanagement({ version: "v1", auth });
}

// GET /enterprise - Get current Google Enterprise configuration
router.get("/enterprise", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("automation_settings")
      .select("value")
      .eq("key", "google_enterprise_id")
      .maybeSingle();

    if (error) throw error;
    res.json({ enterpriseId: data?.value || null });
  } catch (error: any) {
    console.error("[Device Locks] Error getting enterprise:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /enterprise/signup-url - Generate Google Enterprise Signup URL
router.post("/enterprise/signup-url", async (req, res) => {
  try {
    const amapi = getAmapiClient();
    
    // We redirect to the API callback route
    const callbackUrl = req.body.callbackUrl || "https://mdrinformaticaecelulares.com.br/api/device-locks/callback";
    
    const signup = await amapi.signupUrls.create({
      projectId: "crm-mdr",
      callbackUrl: callbackUrl
    });

    // Save the signupUrlName to database so callback can retrieve it
    await supabase
      .from("automation_settings")
      .upsert(
        { key: "google_signup_url_name", value: signup.data.name, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

    res.json({
      url: signup.data.url,
      name: signup.data.name // This contains the signup token name (e.g. signupUrls/...)
    });
  } catch (error: any) {
    console.error("[Device Locks] Error generating signup URL:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /callback - Google Android Enterprise Callback handler
router.get("/callback", async (req, res) => {
  try {
    let { enterpriseToken, signupUrlName } = req.query;

    if (!enterpriseToken) {
      return res.status(400).send("<h1>Erro: Token do Enterprise ausente.</h1>");
    }

    if (!signupUrlName) {
      // Fetch the latest generated signup url name from database
      const { data, error: dbError } = await supabase
        .from("automation_settings")
        .select("value")
        .eq("key", "google_signup_url_name")
        .maybeSingle();
      
      if (!dbError && data?.value) {
        signupUrlName = data.value;
      }
    }

    if (!signupUrlName) {
      return res.status(400).send("<h1>Erro: Nome da URL de inscrição ausente ou expirado. Inicie o registro novamente pelo painel do CRM.</h1>");
    }

    const amapi = getAmapiClient();

    // Call enterprises.create to complete the registration and obtain the Enterprise ID
    const enterprise = await amapi.enterprises.create({
      enterpriseToken: enterpriseToken as string,
      signupUrlName: signupUrlName as string,
      projectId: "crm-mdr",
      requestBody: {}
    });

    const enterpriseId = enterprise.data.name; // Format: enterprises/LCxxxxxxx

    // Save/upsert the Enterprise ID to automation_settings
    const { error } = await supabase
      .from("automation_settings")
      .upsert(
        { key: "google_enterprise_id", value: enterpriseId, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

    if (error) throw error;

    // Redirect or display success message
    res.send(`
      <html>
        <head>
          <title>Sucesso - Android Enterprise</title>
          <style>
            body {
              background-color: #121215;
              color: white;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .card {
              background: rgba(255,255,255,0.02);
              border: 1px solid rgba(255,255,255,0.05);
              padding: 40px;
              border-radius: 24px;
              text-align: center;
              max-width: 400px;
            }
            h1 { color: #4BE277; margin-bottom: 10px; font-size: 24px; }
            p { color: #a0a0a5; font-size: 14px; line-height: 1.6; }
            .badge {
              background: rgba(75,226,119,0.1);
              color: #4BE277;
              padding: 8px 16px;
              border-radius: 12px;
              display: inline-block;
              margin-top: 15px;
              font-family: monospace;
              font-weight: bold;
            }
            button {
              background: white;
              color: black;
              border: none;
              padding: 12px 24px;
              border-radius: 12px;
              margin-top: 25px;
              cursor: pointer;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Vinculado com Sucesso!</h1>
            <p>Sua conta Google Enterprise foi associada com sucesso ao CRM MDR.</p>
            <div class="badge">${enterpriseId}</div>
            <br/>
            <button onclick="window.close()">Fechar Janela</button>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("[Device Locks] Callback error:", error);
    res.status(500).send(`<h1>Erro ao vincular conta:</h1><p>${error.message}</p>`);
  }
});

// DELETE /enterprise - Unlink/Delete Google Enterprise association
router.delete("/enterprise", async (req, res) => {
  try {
    const { error } = await supabase
      .from("automation_settings")
      .delete()
      .eq("key", "google_enterprise_id");

    if (error) throw error;
    res.json({ success: true, message: "Vínculo com Google Enterprise removido com sucesso." });
  } catch (error: any) {
    console.error("[Device Locks] Error deleting enterprise link:", error);
    res.status(500).json({ error: error.message });
  }
});


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

    if (lock.lock_type === 'android') {
      // Manual Google Device Lock Controller locking for Android
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

      // Registrar log
      await supabase.from('device_block_logs').insert([{
        customer_id: req.body.customerId || null,
        imei: lock.device?.imei || 'MANUAL_IMEI',
        action: 'block',
        reason: 'Bloqueio do Google Device Lock Controller Confirmado Manualmente',
        success: true
      }]);

      return res.json({
        success: true,
        data: updatedLock,
        message: 'Confirmação do bloqueio manual do Android gravado com sucesso!'
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

    if (lock.lock_type === 'android') {
      // Manual Google Device Lock Controller unlocking for Android
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

      // Registrar log
      await supabase.from('device_block_logs').insert([{
        customer_id: req.body.customerId || null,
        imei: lock.device?.imei || 'MANUAL_IMEI',
        action: 'unblock',
        reason: 'Desbloqueio do Google Device Lock Controller Confirmado Manualmente',
        success: true
      }]);

      return res.json({
        success: true,
        data: updatedLock,
        message: 'Confirmação de liberação manual do Android gravado com sucesso!'
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
