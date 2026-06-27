// supabase/functions/btcpay-confirmations/index.ts
// @ts-nocheck

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BTCPAY_WEBHOOK_SECRET = Deno.env.get('BTCPAY_WEBHOOK_SECRET')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifySignature(body: string, sigHeader: string | null): Promise<boolean> {
  if (!sigHeader || !BTCPAY_WEBHOOK_SECRET) return false;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(BTCPAY_WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expected = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const received = sigHeader.replace('sha256=', '');
    return expected === received;
  } catch {
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const body = await req.text();
  const sigHeader = req.headers.get('BTCPay-Sig');

  const valid = await verifySignature(body, sigHeader);
  if (!valid) {
    console.error('[btcpay] Invalid signature. Header:', sigHeader);
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response('Bad Request: invalid JSON', { status: 400 });
  }

  const { type, invoiceId, metadata, payment } = payload;

  const statusMap: Record<string, string> = {
    'InvoiceCreated': 'new',
    'InvoiceReceivedPayment': 'processing',
    'InvoiceProcessing': 'processing',
    'InvoiceSettled': 'settled',
    'InvoiceExpired': 'expired',
    'InvoiceInvalid': 'invalid',
    'InvoicePaymentSettled': 'settled',
  };

  const status = statusMap[type] ?? 'unknown';
  const paymentMethod = payment?.paymentMethod ?? null;
  const amountCrypto = payment?.value ? parseFloat(payment.value) : null;
  const currency = payment?.currency ?? null;
  const campaignId = metadata?.campaignId ?? null;
  const userId = metadata?.userId ?? null;

  if (!invoiceId) {
    return new Response('Bad Request: missing invoiceId', { status: 400 });
  }

  const { error: upsertError } = await supabase
    .from('donation_payments')
    .upsert(
      {
        btcpay_invoice_id: invoiceId,
        status,
        payment_method: paymentMethod,
        amount_crypto: amountCrypto,
        currency,
        campaign_id: campaignId,
        user_id: userId,
        metadata: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'btcpay_invoice_id' }
    );

  if (upsertError) {
    console.error('[btcpay] Upsert error:', upsertError);
    return new Response('Internal Server Error', { status: 500 });
  }

  if (status === 'settled' && campaignId && amountCrypto) {
    await supabase.rpc('increment_campaign_raised' as any, {
      p_campaign_id: campaignId,
      p_amount: amountCrypto,
    }).catch(() => { });
  }

  // ── Piece Download Grant ───────────────────────────────────────────────────
  // If this payment was for a premium media download (piece_id + quality_tier
  // set in metadata by DownloadPortal), write a time-limited grant so the
  // frontend can serve the signed URL without re-prompting for payment.
  const pieceId = metadata?.piece_id ?? null;
  const qualityTier = metadata?.quality_tier ?? null;

  if (status === 'settled' && userId && pieceId && qualityTier) {
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72 h
    const { error: grantError } = await supabase
      .from('piece_download_grants' as any)
      .upsert(
        {
          user_id: userId,
          piece_id: pieceId,
          quality_tier: qualityTier,
          invoice_id: invoiceId,
          expires_at: expiresAt,
          granted_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,piece_id,quality_tier' }
      );

    if (grantError) {
      console.error('[btcpay] Failed to write download grant:', grantError);
    } else {
      console.log(`[btcpay] Download grant issued → user:${userId} piece:${pieceId} tier:${qualityTier} expires:${expiresAt}`);
    }
  }

  console.log(`[btcpay] Invoice ${invoiceId} → ${status} (${paymentMethod ?? 'unknown rail'})`);
  return new Response(JSON.stringify({ ok: true, status }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});