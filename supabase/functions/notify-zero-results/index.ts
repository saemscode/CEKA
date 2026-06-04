// supabase/functions/notify-zero-results/index.ts
// Edge Function: fires when a search returns zero results
// Aggregates zero-result queries and alerts CEKA admins via Telegram

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function sendTelegramAlert(message: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_ADMIN_CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
    }),
  });
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { query, userId, timestamp } = await req.json();

    if (!query?.trim()) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Count how many times this exact query has returned zero results in last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('search_events')
      .select('*', { count: 'exact', head: true })
      .eq('query', query.toLowerCase().trim())
      .eq('zero_results', true)
      .gte('created_at', since);

    const hitCount = count ?? 0;

    // Alert threshold: 5+ zero-result hits for the same query in 24h
    if (hitCount >= 5) {
      const message =
        `🚨 *CEKA Zero-Result Alert*\n\n` +
        `Query: \`${query}\`\n` +
        `Zero-result hits (24h): *${hitCount}*\n` +
        `Time: ${new Date(timestamp).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}\n\n` +
        `📝 Consider publishing civic content on this topic.`;

      await sendTelegramAlert(message);
    }

    return new Response(JSON.stringify({ ok: true, hitCount }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('notify-zero-results error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
});
