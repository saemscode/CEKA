// @ts-nocheck

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as crypto from 'https://deno.land/std@0.177.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * PAYSTACK WEBHOOK HANDLER (PHASE 3 - PUBLIC SCHEMA)
 * 
 * This version uses the standard 'public' schema to bypass
 * complex Supabase dashboard configuration.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('x-paystack-signature')
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing signature' }), { status: 401 })
    }

    const bodyText = await req.text()
    const secret = Deno.env.get('PAYSTACK_WEBHOOK_SECRET') || Deno.env.get('PAYSTACK_SECRET_KEY')

    if (!secret) throw new Error('PAYSTACK_WEBHOOK_SECRET not configured')

    const hash = crypto
      .createHmac('sha512', secret)
      .update(bodyText)
      .digest('hex')

    if (hash !== signature) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 })
    }

    const payload = JSON.parse(bodyText)
    const event = payload.event
    const data = payload.data

    console.log(`[Paystack-Webhook] Received event: ${event}`)

    const supabaseMainUrl = Deno.env.get('PROJECT_URL') || Deno.env.get('SUPABASE_URL')
    const supabaseMainKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    const supabaseDonationsUrl = Deno.env.get('DONATIONS_SUPABASE_URL')
    const supabaseDonationsKey = Deno.env.get('DONATIONS_SERVICE_ROLE_KEY')

    if (!supabaseMainUrl || !supabaseMainKey) throw new Error('Main Database credentials not found')
    if (!supabaseDonationsUrl || !supabaseDonationsKey) throw new Error('Donations Database credentials not found')

    const supabaseMain = createClient(supabaseMainUrl, supabaseMainKey)
    const supabaseDonations = createClient(supabaseDonationsUrl, supabaseDonationsKey)

    // Log Raw Payload (using public schema on Project 1)
    await supabaseMain
      .from('audit_trail')
      .insert({
        event_type: event,
        raw_payload: payload
      })

    if (event === 'charge.success') {
      const { error: txError } = await supabaseDonations
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

      if (txError) console.error('[Paystack-Webhook] DB Error (Transaction):', txError)

      if (data.reference?.startsWith('DL-')) {
        console.log(`[Paystack-Webhook] Detected Pieces transaction: ${data.reference}`)
        
        const { error: pieceError } = await supabaseMain
          .from('piece_transactions')
          .update({
            status: 'verified',
            verified_at: new Date().toISOString(),
          })
          .eq('reference', data.reference)

        if (pieceError) {
          console.error('[Paystack-Webhook] Pieces verification failed:', pieceError)
        } else {
          console.log(`[Paystack-Webhook] Piece transaction ${data.reference} verified successfully.`)
        }
      }
    }

    else if (event === 'subscription.create' || event === 'subscription.enable') {
      const { error: subError } = await supabaseDonations
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

      if (subError) console.error('[Paystack-Webhook] DB Error (Subscription):', subError)
    }

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
