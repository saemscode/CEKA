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
  audience_filter: 'all' | 'by_county' | 'by_interest' | 'by_role';
  filter_value?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the requester is an admin
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const isAdmin = roleData?.role === 'admin' || roleData?.role === 'core_team' || user.email === 'civiceducationkenya@gmail.com';

      if (!isAdmin) {
        // Fallback: check profiles.is_admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile?.is_admin) {
          return new Response(
            JSON.stringify({ error: 'Forbidden: Admin access required' }),
            { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }
    }

    const body: BroadcastRequest = await req.json();
    const { subject, html_content, audience_filter, filter_value } = body;

    if (!subject || !html_content) {
      return new Response(
        JSON.stringify({ error: 'Subject and html_content are required' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ─── Build recipient list ─────────────────────────────────────────
    let query = supabase
      .from('community_members')
      .select('email, first_name')
      .neq('status', 'rejected');

    if (audience_filter === 'by_county' && filter_value) {
      query = query.eq('county', filter_value);
    } else if (audience_filter === 'by_interest' && filter_value) {
      query = query.contains('areas_of_interest', [filter_value]);
    }

    const { data: recipients, error: queryError } = await query;

    if (queryError) {
      console.error("Error querying recipients:", queryError);
      return new Response(
        JSON.stringify({ error: 'Failed to query recipients' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No recipients found for the selected audience' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ─── Deduplicate emails ───────────────────────────────────────────
    const emailSet = new Set<string>();
    const uniqueRecipients: Array<{ email: string; first_name: string }> = [];
    for (const r of recipients) {
      const email = (r.email as string)?.toLowerCase().trim();
      if (email && !emailSet.has(email)) {
        emailSet.add(email);
        uniqueRecipients.push({ email, first_name: r.first_name as string || 'Citizen' });
      }
    }

    // ─── Send in batches of 50 ────────────────────────────────────────
    const BATCH_SIZE = 50;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < uniqueRecipients.length; i += BATCH_SIZE) {
      const batch = uniqueRecipients.slice(i, i + BATCH_SIZE);
      const batchEmails = batch.map(r => r.email);

      try {
        await sendEmail({
          to: batchEmails,
          subject: subject,
          html: html_content,
          provider: 'auto'
        });
        sent += batch.length;
      } catch (batchError) {
        console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, batchError);

        // Try individual sends for the failed batch
        for (const recipient of batch) {
          try {
            await sendEmail({
              to: [recipient.email],
              subject: subject,
              html: html_content,
              provider: 'auto'
            });
            sent++;
          } catch {
            failed++;
          }
        }
      }
    }

    // ─── Log broadcast ────────────────────────────────────────────────
    const authUser = authHeader ? (await supabase.auth.getUser(authHeader.replace('Bearer ', ''))).data.user : null;

    await supabase.from("admin_audit_log").insert({
      user_id: authUser?.id || null,
      action: "send_broadcast",
      resource_type: "email_broadcast",
      details: {
        subject,
        audience_filter,
        filter_value: filter_value || null,
        total_recipients: uniqueRecipients.length,
        sent,
        failed,
        status: failed === 0 ? 'completed' : 'partial'
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        broadcast_id: crypto.randomUUID(),
        total_recipients: uniqueRecipients.length,
        sent,
        failed,
        status: failed === 0 ? 'completed' : 'partial'
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("send-broadcast-email error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
