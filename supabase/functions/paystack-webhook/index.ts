// @ts-nocheck

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as crypto from 'https://deno.land/std@0.177.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * PAYSTACK WEBHOOK HANDLER (PHASE 3 - ISOLATED LEDGER)
 * 
 * This function processes incoming Paystack events and routes them
 * to the new transactional database (ftswzvqwxdwgkvfbwfpx).
 * 
 * It ensures that financial data is isolated from the main app DB.
 */
serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('x-paystack-signature')
    if (!signature) {
      console.error('[Paystack-Webhook] Missing signature')
      return new Response(JSON.stringify({ error: 'Missing signature' }), { status: 401 })
    }

    const bodyText = await req.text()

    // 2. Verify Signature
    // Note: PAYSTACK_WEBHOOK_SECRET should be set in Supabase project secrets
    const secret = Deno.env.get('PAYSTACK_WEBHOOK_SECRET') || Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!secret) {
      throw new Error('PAYSTACK_WEBHOOK_SECRET not configured')
    }

    const hash = crypto
      .createHmac('sha512', secret)
      .update(bodyText)
      .digest('hex')

    if (hash !== signature) {
      console.error('[Paystack-Webhook] Signature mismatch')
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 })
    }

    const payload = JSON.parse(bodyText)
    const event = payload.event
    const data = payload.data

    console.log(`[Paystack-Webhook] Received event: ${event}`)

    // 3. Connect to the NEW Transactional Database
    // These keys must be set in the Supabase Project Settings / Secrets
    const supabaseUrl = Deno.env.get('PROJECT_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('New Database credentials (PROJECT_URL/SERVICE_ROLE_KEY) not found in environment')
    }

    const supabaseLedger = createClient(supabaseUrl, supabaseServiceKey)

    // 4. Log Raw Payload to Audit Trail (Redundancy)
    await supabaseLedger
      .schema('ledger')
      .from('audit_trail')
      .insert({
        event_type: event,
        raw_payload: payload
      })

    // 5. Handle Specific Events
    if (event === 'charge.success') {
      const { error: txError } = await supabaseLedger
        .schema('ledger')
        .from('transactions')
        .insert({
          paystack_id: data.id.toString(),
          reference: data.reference,
          status: data.status,
          amount: data.amount,
          currency: data.currency,
          email: data.customer.email,
          customer_code: data.customer.customer_code,
          channel: data.channel,
          ip_address: data.ip_address,
          metadata: data.metadata || {},
          fees: data.fees,
          paid_at: data.paid_at
        })

      if (txError) {
        console.error('[Paystack-Webhook] DB Error (Transaction):', txError)
        // We don't return 500 here yet to acknowledge receipt to Paystack
      }
    }

    else if (event === 'subscription.create' || event === 'subscription.enable') {
      const { error: subError } = await supabaseLedger
        .schema('ledger')
        .from('subscriptions')
        .upsert({
          external_customer_id: data.customer.customer_code,
          plan_code: data.plan.plan_code,
          subscription_code: data.subscription_code,
          email: data.customer.email,
          status: data.status,
          next_payment_date: data.next_payment_date,
          metadata: data.metadata || {}
        }, { onConflict: 'subscription_code' })

      if (subError) {
        console.error('[Paystack-Webhook] DB Error (Subscription):', subError)
      }
    }

    // 6. Return 200 OK to Paystack
    return new Response(JSON.stringify({ status: 'success', received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: any) {
    console.error('[Paystack-Webhook] Critical Error:', error.message)
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
