import { serve } from "std/http/server"
import { createClient } from "supabase"

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ""
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req: Request) => {
  try {
    const payload = await req.json()
    const { event, instance, data } = payload

    console.log(`Received event: ${event} from instance: ${instance}`)

    if (event === 'messages.upsert') {
      const message = data.message
      const remoteJid = data.key.remoteJid
      const pushName = data.pushName
      
      // Extract text content
      const text = message?.conversation || 
                   message?.extendedTextMessage?.text || 
                   message?.imageMessage?.caption || ""

      if (text) {
        const { error } = await supabase
          .from('messages')
          .insert({
            instance_name: instance,
            remote_jid: remoteJid,
            sender_name: pushName,
            content: text,
            is_from_me: data.key.fromMe,
            timestamp: new Date(data.messageTimestamp * 1000).toISOString(),
            status: 'received'
          })

        if (error) throw error
      }
    }

    if (event === 'messages.update') {
      // Handle read receipts or status updates
      const { key, update } = data
      if (update.status) {
        const { error } = await supabase
          .from('messages')
          .update({ status: update.status })
          .eq('remote_jid', key.remoteJid)
          .eq('id_from_api', key.id)

        if (error) throw error
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error: any) {
    console.error('Webhook error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    })
  }
})
