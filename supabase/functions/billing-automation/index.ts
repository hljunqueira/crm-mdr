import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ""
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // 1. Fetch installments due today or overdue
    const { data: installments, error: instError } = await supabase
      .from('installments')
      .select(`
        *,
        customers (name, phone),
        units (name, evolution_api_url, evolution_api_key, evolution_instance)
      `)
      .in('status', ['pending', 'overdue'])
      .eq('due_date', today)

    if (instError) throw instError

    console.log(`Processing ${installments?.length} installments for ${today}`)

    for (const inst of installments || []) {
      const { customers: customer, units: unit } = inst
      
      if (!customer?.phone || !unit?.evolution_api_url) continue

      const message = `Olá ${customer.name}, lembramos que sua parcela da ${unit.name} no valor de R$ ${inst.value.toFixed(2)} vence hoje. Evite bloqueios e realize o pagamento via PIX.`

      // 2. Send via Evolution API
      const response = await fetch(`${unit.evolution_api_url}/message/sendText/${unit.evolution_instance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': unit.evolution_api_key
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
  } catch (error) {
    console.error('Automation error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    })
  }
})
