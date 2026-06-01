//@ts-nocheck

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── CONFIG ─────────────────────────────────────────────
const TELEGRAM_API = 'https://api.telegram.org/bot';
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── TELEGRAM API HELPER ─────────────────────────────────
async function sendMessage(chatId: number, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
  await fetch(`${TELEGRAM_API}${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true
    })
  });
}

// ─── MAIN HANDLER ────────────────────────────────────────
// @ts-ignore: Deno is a global in the Edge Runtime
Deno.serve(async (req: Request) => {
  // 1. Reject non-POST silently (health probes, etc.)
  if (req.method !== 'POST') {
    return new Response('OK', { status: 200 });
  }

  // 2. Safely parse JSON — NEVER crash on empty/malformed body
  let body: any;
  try {
    body = await req.json();
  } catch {
    console.log('Empty or invalid JSON body — returning 200 to Telegram');
    return new Response('OK', { status: 200 });
  }

  // 3. Extract message or callback_query
  const msg = body.message;
  const callback = body.callback_query;

  if (!msg && !callback) {
    console.log('No message or callback in update — ignoring');
    return new Response('OK', { status: 200 });
  }

  // ─── CALLBACK QUERY HANDLER (inline buttons) ─────────
  if (callback) {
    const cbData = callback.data as string;
    const cbChatId = (callback.message as any)?.chat?.id as number;
    const cbFromId = callback.from?.id as number;

    if (cbData?.startsWith('lang:')) {
      const chosenLang = cbData.replace('lang:', '');
      // Store preference in profiles or temporary state
      await supabase.from('profiles').upsert({
        telegram_id: cbFromId.toString(),
        preferred_lang: chosenLang,
        updated_at: new Date().toISOString()
      }, { onConflict: 'telegram_id' });

      await sendMessage(cbChatId, `✅ Language set to <b>${chosenLang}</b>. You will receive tasks in this language.`);
    }

    return new Response('OK', { status: 200 });
  }

  // ─── MESSAGE HANDLER ─────────────────────────────────
  const chatId = (msg?.chat as Record<string, unknown>)?.id as number;
  const fromId = (msg?.from as Record<string, unknown>)?.id as number;
  const username = (msg?.from as Record<string, unknown>)?.username as string | undefined;
  const text = (msg?.text as string)?.trim() || '';

  if (!chatId || !fromId) {
    return new Response('OK', { status: 200 });
  }

  try {
    // ─── /start ───────────────────────────────────────
    if (text === '/start') {
      const welcome = `🇰🇪 <b>Welcome to CEKA Translations!</b>\n\nYou will receive small civic education texts to translate into your chosen language. Each task takes 30 seconds.\n\n<b>Reply format:</b>\nLANG:[code]\n[your translation]\n\n<b>Example:</b>\nLANG:sw\nKatiba inahakikisha haki za binadamu.\n\nChoose your language below:`;

      await fetch(`${TELEGRAM_API}${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcome,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🇰🇪 Kiswahili', callback_data: 'lang:sw' }],
              [{ text: '🇰🇪 Gikuyu', callback_data: 'lang:ki' }],
              [{ text: '🇰🇪 Dholuo', callback_data: 'lang:luo' }],
              [{ text: '🇰🇪 Luhya', callback_data: 'lang:luy' }],
              [{ text: '🇰🇪 Kamba', callback_data: 'lang:kam' }]
            ]
          }
        })
      });

      // Upsert basic profile
      await supabase.from('profiles').upsert({
        telegram_id: fromId.toString(),
        telegram_username: username || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'telegram_id' });

      return new Response('OK', { status: 200 });
    }

    // ─── /help or HELP ────────────────────────────────
    if (text === '/help' || text.toUpperCase() === 'HELP') {
      const helpText = `📖 <b>CEKA Bot Commands</b>\n\n/start — Register and choose language\n/help — Show this guide\n/tasks — Request a task immediately\n/skip — Skip current task\n/status — Your contribution stats\n\n<b>Supported codes:</b>\nsw — Kiswahili\nki — Gikuyu\nluo — Dholuo\nluy — Luhya\nkam — Kamba\n\nSend translations as:\n<code>LANG:sw\nYour translation here</code>`;

      await sendMessage(chatId, helpText);
      return new Response('OK', { status: 200 });
    }

    // ─── /tasks ───────────────────────────────────────
    if (text === '/tasks') {
      await pushTaskToUser(chatId, fromId);
      return new Response('OK', { status: 200 });
    }

    // ─── SKIP ─────────────────────────────────────────
    if (text.toUpperCase() === 'SKIP') {
      const { data: openTask } = await supabase
        .from('translation_tasks')
        .select('id')
        .eq('assigned_to_telegram', fromId.toString())
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (openTask) {
        await supabase.from('translation_tasks').update({ status: 'expired' }).eq('id', openTask.id);
        await sendMessage(chatId, '⏭️ Task skipped. You will receive the next available task.');
      } else {
        await sendMessage(chatId, 'ℹ️ No active task to skip.');
      }

      return new Response('OK', { status: 200 });
    }

    // ─── /status ──────────────────────────────────────
    if (text === '/status') {
      const { count: approved } = await supabase
        .from('translation_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('submitted_by_telegram', fromId.toString())
        .eq('status', 'approved');

      const { count: pending } = await supabase
        .from('translation_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('submitted_by_telegram', fromId.toString())
        .eq('status', 'pending');

      await sendMessage(chatId, `📊 <b>Your Stats</b>\n\n✅ Approved: ${approved || 0}\n⏳ Pending review: ${pending || 0}\n\nKeep contributing! ✊🏽`);
      return new Response('OK', { status: 200 });
    }

    // ─── TRANSLATION SUBMISSION: LANG:xx ──────────────
    const langMatch = text.match(/^LANG:\s*(\w+)\s*\n?([\s\S]+)/i);

    if (langMatch) {
      const langCode = langMatch[1].toLowerCase().trim();
      const translation = langMatch[2].trim();

      // Validate language exists
      const { data: langRow } = await supabase
        .from('languages')
        .select('code')
        .eq('code', langCode)
        .eq('active', true)
        .single();

      if (!langRow) {
        await sendMessage(chatId, `❌ Language code "<code>${langCode}</code>" not found. Send HELP for valid codes.`);
        return new Response('OK', { status: 200 });
      }

      console.log(`[BOT] Incoming from ${username || fromId}: "${text}" (Chat: ${chatId})`)

      // Find the most recent task assigned to this user
      const { data: task } = await supabase
        .from('translation_tasks')
        .select('id, unit_id')
        .eq('assigned_to_telegram', fromId.toString())
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!task) {
        await sendMessage(chatId, '⚠️ No active task found for you. Send /tasks to get one.');
        return new Response('OK', { status: 200 });
      }

      // Insert submission
      const { error: subError } = await supabase.from('translation_submissions').insert({
        unit_id: task.unit_id,
        lang_code: langCode,
        translated_text: translation,
        submitted_by_telegram: fromId.toString(),
        channel: 'telegram',
        status: 'pending',
        confidence_score: 0.5
      });

      if (subError) {
        console.error('Submission insert failed:', subError);
        await sendMessage(chatId, '⚠️ Failed to save your translation. Please try again.');
        return new Response('OK', { status: 200 });
      }

      // Mark task as submitted
      await supabase.from('translation_tasks').update({ status: 'submitted' }).eq('id', task.id);

      await sendMessage(chatId, `✅ <b>Translation received!</b>\n\nLanguage: ${langCode}\nStatus: Pending review\n\nThank you for contributing to CEKA! 🇰🇪`);
      return new Response('OK', { status: 200 });
    }

    // ─── UNRECOGNIZED ─────────────────────────────────
    await sendMessage(chatId, `❓ I didn't understand that.\n\nSend HELP for instructions or /tasks to get a translation task.`);
    return new Response('OK', { status: 200 });

  } catch (err) {
    console.error('Bot handler error:', err);
    await sendMessage(chatId, '⚠️ Something went wrong. Send HELP for instructions.');
    return new Response('OK', { status: 200 });
  }
});

// ─── PUSH TASK TO USER ─────────────────────────────────
async function pushTaskToUser(chatId: number, telegramUserId: number) {
  // Get user's preferred language
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_lang')
    .eq('telegram_id', telegramUserId.toString())
    .single();

  const preferredLang = profile?.preferred_lang || 'sw';

  // Find an open task for this language not yet assigned
  const { data: task } = await supabase
    .from('translation_tasks')
    .select('id, unit_id, lang_code')
    .eq('channel', 'telegram')
    .eq('status', 'open')
    .eq('lang_code', preferredLang)
    .is('assigned_to_telegram', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!task) {
    await sendMessage(chatId, 'ℹ️ No open tasks available in your language right now. Check back later!');
    return;
  }

  // Get the source text
  const { data: unit } = await supabase
    .from('translation_units')
    .select('source_text, context_note, char_limit, type, carousel_id, slide_number')
    .eq('id', task.unit_id)
    .single();

  if (!unit) {
    await sendMessage(chatId, '⚠️ Task data missing. Please try /tasks again.');
    return;
  }

  // Assign task to user
  await supabase.from('translation_tasks').update({
    assigned_to_telegram: telegramUserId.toString(),
    status: 'in_progress'
  }).eq('id', task.id);

  // Compose message
  const charLimit = unit.char_limit ? `\n<i>Max ${unit.char_limit} characters</i>` : '';
  const context = unit.context_note ? `\n<i>${unit.context_note}</i>` : '';

  const message = `🇰🇪 <b>CEKA Translation Task</b>\n\nCampaign: <code>${unit.carousel_id}</code>\nSlide ${unit.slide_number} — <i>${unit.type}</i>\n\n<b>Source (English):</b>\n<blockquote>${unit.source_text}</blockquote>\n${context}${charLimit}\n\n<b>To submit:</b>\n<code>LANG:${preferredLang}\n[your translation here]</code>\n\nSend <code>SKIP</code> to pass.`;

  await sendMessage(chatId, message);
}
