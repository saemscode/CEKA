import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailing.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const body = await req.json();
    const { invite_id } = body;

    if (!invite_id) {
      return new Response(JSON.stringify({ error: "invite_id is required" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Fetch the invite with from_campaign details and partner details
    const { data: invite, error: inviteError } = await supabase
      .from('collaboration_invites')
      .select(`
        *,
        from_campaign:from_campaign_id (id, title, organizer, slug),
        partner:partner_id (id, org_name, org_email, submitted_by_user_id)
      `)
      .eq('id', invite_id)
      .single();

    if (inviteError || !invite) {
      throw new Error(`Failed to fetch invite: ${inviteError?.message}`);
    }

    const partnerOrgName = invite.partner?.org_name || 'Your Organisation';
    const partnerEmail = invite.partner?.org_email;
    const campaignTitle = invite.from_campaign?.title || 'a CEKA Campaign';
    const campaignSlug = invite.from_campaign?.slug || invite.from_campaign_id;

    if (!partnerEmail) {
      throw new Error("Partner email not found — cannot notify.");
    }

    // Send invite notification email
    const subject = `🤝 You've received a CEKA Collaboration Invite: "${campaignTitle}"`;
    const html = buildInviteEmail(partnerOrgName, campaignTitle, campaignSlug, invite_id);

    await sendEmail({
      to: [partnerEmail],
      subject,
      html,
      provider: 'auto'
    });

    // Mark invite as notified
    await supabase
      .from('collaboration_invites')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', invite_id);

    // Audit log
    await supabase.from("admin_audit_log").insert({
      action: "collaboration_invite_email_sent",
      resource_type: "collaboration_invite",
      resource_id: invite_id,
      details: { partner_email: partnerEmail, campaign_title: campaignTitle }
    });

    return new Response(JSON.stringify({ success: true, invite_id }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error) {
    console.error("send-collab-invite error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});

// ─── Email Template ──────────────────────────────────────────────────────────

function buildInviteEmail(orgName: string, campaignTitle: string, campaignSlug: string, inviteId: string): string {
  const dashboardUrl = `https://civiceducationkenya.com/partner/dashboard`;
  const campaignUrl = `https://civiceducationkenya.com/campaign/${campaignSlug}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CEKA Collaboration Invite</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background: #f5f5f7; }
    .container { max-width: 580px; margin: 40px auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #004d00 0%, #006633 100%); padding: 40px 32px; text-align: center; }
    .header h1 { color: #fff; font-size: 24px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.85); font-size: 14px; margin: 0; }
    .body { padding: 40px 32px; }
    .body h2 { font-size: 20px; font-weight: 700; margin: 0 0 16px 0; color: #1a1a1a; }
    .body p { font-size: 15px; color: #555; margin: 0 0 16px 0; }
    .campaign-card { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #bbf7d0; border-radius: 16px; padding: 20px 24px; margin: 24px 0; }
    .campaign-card .label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #166534; margin-bottom: 6px; }
    .campaign-card .value { font-size: 18px; font-weight: 700; color: #14532d; }
    .btn-primary { display: inline-block; background: #006633; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 14px; font-weight: 700; font-size: 14px; margin-right: 12px; margin-top: 16px; }
    .btn-secondary { display: inline-block; background: #f3f4f6; color: #374151; text-decoration: none; padding: 14px 32px; border-radius: 14px; font-weight: 700; font-size: 14px; margin-top: 16px; }
    .divider { height: 1px; background: #e5e7eb; margin: 28px 0; }
    .footer { padding: 24px 32px; background: #fafafa; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤝 Collaboration Invite</h1>
      <p>CEKA Partnership Program</p>
    </div>
    <div class="body">
      <h2>Habari, ${orgName}!</h2>
      <p>CEKA has sent your organisation a formal collaboration invite on the following campaign:</p>

      <div class="campaign-card">
        <div class="label">Campaign</div>
        <div class="value">${campaignTitle}</div>
      </div>

      <p>As a verified CEKA partner, you can <strong>accept or decline</strong> this invite from your Partner Dashboard. Once accepted, your organisation will be publicly credited as a <strong>Collaboration Partner</strong> on this campaign.</p>

      <div class="divider"></div>

      <a href="${dashboardUrl}" class="btn-primary">Open Partner Dashboard →</a>
      <a href="${campaignUrl}" class="btn-secondary">View Campaign</a>
    </div>
    <div class="footer">
      <p>You received this email because your organisation is a verified CEKA Partner.</p>
      <p>Invite ID: <code style="font-size: 10px;">${inviteId}</code></p>
      <p>© ${new Date().getFullYear()} Civic Education Kenya Alliance</p>
    </div>
  </div>
</body>
</html>`;
}
