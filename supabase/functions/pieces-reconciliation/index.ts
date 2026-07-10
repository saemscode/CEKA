// supabase/functions/pieces-reconciliation/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // Simple auth to prevent randoms from triggering the script
  const authHeader = req.headers.get('x-reconciliation-key');
  if (authHeader !== Deno.env.get('RECONCILIATION_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Pieces Database
  const piecesSupabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Mother Database (Using existing DONATIONS variables)
  const motherSupabase = createClient(
    Deno.env.get('DONATIONS_SUPABASE_URL')!,
    Deno.env.get('DONATIONS_SERVICE_ROLE_KEY')!
  );

  // Look back 14 days
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Get all successful Pieces downloads
  const { data: pieceTxns, error: fetchError } = await piecesSupabase
    .from('piece_transactions')
    .select('*')
    .in('status', ['verified', 'delivered'])
    .gte('created_at', since);

  if (fetchError || !pieceTxns || pieceTxns.length === 0) {
    return new Response(JSON.stringify({ message: 'Nothing to reconcile' }), { status: 200 });
  }

  const references = pieceTxns.map(t => t.reference);

  // 2. See which ones are already safely in the Mother DB
  const { data: existing } = await motherSupabase
    .from('transactions')
    .select('reference')
    .in('reference', references);

  const existingRefs = new Set((existing ?? []).map(r => r.reference));
  
  // 3. Find the missing ones
  const missing = pieceTxns.filter(t => !existingRefs.has(t.reference));

  let insertedCount = 0;
  const failures: string[] = [];

  // 4. Insert the missing ones into Mother DB
  for (const txn of missing) {
    const { error: insertError } = await motherSupabase
      .from('transactions')
      .insert({
        reference: txn.reference,
        status: txn.status,
        amount: Math.round(txn.amount_kes * 100), // KES to Cents
        currency: 'KES',
        email: txn.user_email,
        paid_at: txn.verified_at ?? txn.created_at,
        metadata: {
          source: 'pieces_portal_reconciliation',
          content_slug: txn.content_slug,
          tier: txn.tier,
          asset_path: txn.asset_path,
        },
      });

    if (insertError) failures.push(`${txn.reference}: ${insertError.message}`);
    else insertedCount++;
  }

  const summary = {
    checked: pieceTxns.length,
    already_synced: existingRefs.size,
    inserted: insertedCount,
    failed: failures,
  };

  console.log('[Reconciliation] Run complete:', JSON.stringify(summary));

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
