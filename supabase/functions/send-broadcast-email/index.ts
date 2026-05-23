import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailing.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BroadcastRequest {
  subject: string;
  html_content: string;
  audience_filter: 'all' | 'by_county' | 'by_interest';
  target_list: 'profiles' | 'community' | 'both';
  filter_value?: string;
}

const PersonalizationEngine = (content: string, vars: Record<string, string>) => {
  let personalized = content;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    personalized = personalized.replace(regex, value || '');
  }
  return personalized;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify Admin Access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization');
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const isAdmin = roleData?.role === 'admin' || roleData?.role === 'core_team' || user.email === 'civiceducationkenya@gmail.com';
    if (!isAdmin) throw new Error('Forbidden');

    const body: BroadcastRequest = await req.json();
    const { subject, html_content, audience_filter, target_list, filter_value } = body;

    if (!subject || !html_content) {
      return new Response(JSON.stringify({ error: 'Subject and content required' }), { status: 400, headers: corsHeaders });
    }

    // ─── Build recipient list ─────────────────────────────────────────
    let query = supabase.from('unified_broadcast_list').select('*');

    if (target_list === 'profiles') {
      query = query.eq('source_table', 'profile');
    } else if (target_list === 'community') {
      query = query.eq('source_table', 'community');
    }

    if (audience_filter === 'by_county' && filter_value) {
      query = query.eq('county', filter_value);
    } else if (audience_filter === 'by_interest' && filter_value) {
      query = query.contains('areas_of_interest', [filter_value]);
    }

    const { data: recipients, error: queryError } = await query;
    if (queryError || !recipients) throw queryError || new Error('No recipients');

    // ─── Personalization & Delivery ───────────────────────────────────
    let sent = 0;
    let failed = 0;
    let provider_used = 'resend';

    // Grouping into batches purely for execution efficiency, but personalizing each
    for (const recipient of recipients) {
      const vars = {
        first_name: recipient.first_name || 'Citizen',
        last_name: recipient.last_name || '',
        display_name: recipient.display_name || 'Citizen',
        county: recipient.county || 'Kenya',
        interests: recipient.interests || 'Civic Education'
      };

      const personalizedHtml = PersonalizationEngine(html_content, vars);
      const personalizedSubject = PersonalizationEngine(subject, vars);

      try {
        await sendEmail({
          to: [recipient.email],
          subject: personalizedSubject,
          html: personalizedHtml,
          provider: 'auto'
        });
        sent++;
      } catch (err) {
        console.error(`Send failed to ${recipient.email}:`, err);
        failed++;
      }
    }

    // ─── Log broadcast with provider info ─────────────────────────────
    // For logging, we'll check the audit log to see what the final provider was
    // or we could have sendEmail return the provider.

    await supabase.from("admin_audit_log").insert({
      user_id: user.id,
      action: "send_broadcast",
      resource_type: "email_broadcast",
      details: {
        subject,
        target_list,
        audience_filter,
        total_recipients: recipients.length,
        sent,
        failed,
        provider_used: sent > 0 ? 'auto-balanced' : 'none'
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        total_recipients: recipients.length
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Broadcast Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
