import { serve } from "std/http/server"
import { createClient } from "supabase"

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ""
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req: Request) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    // 1. Fetch installments due today or overdue with correct relations
    const { data: installments, error: instError } = await supabase
      .from('installments')
      .select(`
        *,
        sales (
          customer:customers (name, phone),
          store:stores (name, evolution_api_url, evolution_api_key, evolution_instance)
        )
      `)
      .in('status', ['pending', 'overdue'])
      .eq('due_date', today)

    if (instError) throw instError

    console.log(`Processing ${installments?.length} installments for ${today}`)

    for (const inst of installments || []) {
      const sale = (inst as any).sales;
      const customer = sale?.customer;
      const store = sale?.store;

      if (!customer?.phone || !store?.evolution_api_url || !store?.evolution_instance || !store?.evolution_api_key) continue

      const message = `Olá ${customer.name}, lembramos que sua parcela da ${store.name} no valor de R$ ${inst.value.toFixed(2)} vence hoje. Evite bloqueios e realize o pagamento via PIX.`

      // 2. Send via Evolution API
      const response = await fetch(`${store.evolution_api_url}/message/sendText/${store.evolution_instance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': store.evolution_api_key
        },
        body: JSON.stringify({
          number: customer.phone.replace(/\D/g, ''),
          text: message
        })
      })

      if (response.ok) {
        console.log(`Message sent to ${customer.phone}`)
        // Optional: Update installment to mark reminder sent
      } else {
        console.error(`Failed to send to ${customer.phone}:`, await response.text())
      }
    }

    return new Response(JSON.stringify({ success: true, processed: installments?.length }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error: any) {
    console.error('Automation error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    })
  }
})
