// @ts-nocheck
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailing.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PartnerApprovedRequest {
  partner_id: string;
  org_name: string;
  org_email: string;
  new_status: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: PartnerApprovedRequest = await req.json();
    const { partner_id, org_name, org_email, new_status } = body;

    if (!partner_id || !org_name || !org_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const appUrl = Deno.env.get("SITE_URL") || "https://civiceducationkenya.com";
    const mouSigningLink = `${appUrl}/partner/mou`;

    // Send approval + MOU signing email to the partner
    const approvalHtml = buildApprovalEmail(org_name, partner_id, new_status, mouSigningLink);

    await sendEmail({
      to: [org_email],
      from: { name: "CEKA Partnership Team", email: "welcome@admin.civiceducationkenya.com" },
      subject: `🎉 [CEKA] Your Partnership Application Has Been Approved — ${org_name}`,
      html: approvalHtml,
      provider: 'auto',
    });

    // Audit log
    await supabaseAdmin.from('admin_audit_log').insert({
      action: 'partner_approval_email_sent',
      resource_type: 'partner',
      resource_id: partner_id,
      details: { org_name, org_email, new_status, mou_link: mouSigningLink }
    }).select();

    return new Response(
      JSON.stringify({ success: true, partner_id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("[send-partner-approved] Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

function buildApprovalEmail(orgName: string, partnerId: string, status: string, mouLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CEKA Partnership Approved</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.7; color: #1a1a1a; margin: 0; padding: 0; background: #f0f4f8; }
    .wrapper { padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.10); }
    .header { background: linear-gradient(135deg, #006633 0%, #004d26 100%); padding: 48px 40px; text-align: center; }
    .header h1 { color: #fff; font-size: 28px; font-weight: 900; margin: 0 0 10px; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.80); font-size: 15px; margin: 0; font-weight: 500; }
    .body { padding: 40px; }
    .body h2 { font-size: 22px; font-weight: 800; color: #006633; margin: 0 0 16px; }
    .body p { font-size: 15px; color: #444; margin: 0 0 18px; }
    .next-step-card { background: linear-gradient(135deg, rgba(0,102,51,0.06), rgba(11,36,71,0.06)); border: 2px solid rgba(0,102,51,0.25); border-radius: 20px; padding: 28px; margin: 28px 0; text-align: center; }
    .next-step-card .icon { font-size: 40px; margin-bottom: 12px; }
    .next-step-card h3 { font-size: 18px; font-weight: 900; color: #0b2447; margin: 0 0 8px; }
    .next-step-card p { font-size: 14px; color: #555; margin: 0 0 20px; }
    .cta { display: inline-block; background: linear-gradient(135deg, #006633, #004d26); color: #fff; text-decoration: none; padding: 16px 40px; border-radius: 16px; font-weight: 800; font-size: 15px; }
    .mou-summary { margin: 28px 0; background: #f8f9fb; border-radius: 16px; padding: 24px; }
    .mou-summary h4 { font-size: 14px; font-weight: 800; color: #0b2447; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px; }
    .mou-item { display: flex; gap: 10px; margin-bottom: 10px; font-size: 13px; color: #555; }
    .mou-item span { flex-shrink: 0; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; color: #888; }
    .info-value { font-size: 13px; font-weight: 700; color: #1a1a1a; }
    .footer { padding: 28px 40px; background: #fafafa; border-top: 1px solid #eee; text-align: center; }
    .footer p { font-size: 12px; color: #aaa; margin: 4px 0; }
    .footer a { color: #0b2447; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>🎉 Application Approved!</h1>
        <p>CEKA Partnership Program — Your next step awaits</p>
      </div>
      <div class="body">
        <h2>Congratulations, ${orgName}!</h2>
        <p>We are thrilled to inform you that your organization's application to join the <strong>CEKA Partnership Program</strong> has been reviewed and <strong>approved</strong>. Your verified status is now set to <strong>${status.charAt(0).toUpperCase() + status.slice(1)}</strong>.</p>

        <div class="next-step-card">
          <div class="icon">📋</div>
          <h3>One Last Step: Sign the MOU</h3>
          <p>To activate your full Partner access — including your dashboard, co-branding tools, and collaboration features — you must review and digitally sign the CEKA Memorandum of Understanding (MOU) Agreement.</p>
          <a href="${mouLink}" class="cta">Read &amp; Sign the MOU Agreement →</a>
        </div>

        <div class="mou-summary">
          <h4>What the MOU Covers</h4>
          <div class="mou-item"><span>📌</span><span>Scope of collaboration and joint civic education activities</span></div>
          <div class="mou-item"><span>🎨</span><span>Co-branding standards and intellectual property protections</span></div>
          <div class="mou-item"><span>🔒</span><span>Data protection under the Kenya Data Protection Act (2019)</span></div>
          <div class="mou-item"><span>📊</span><span>Monitoring, evaluation, and reporting obligations</span></div>
          <div class="mou-item"><span>⚖️</span><span>Dispute resolution under Kenyan law</span></div>
          <div class="mou-item"><span>🤝</span><span>Roles, responsibilities, and governance structure</span></div>
        </div>

        <div style="margin: 24px 0;">
          <div class="info-row">
            <span class="info-label">Organization</span>
            <span class="info-value">${orgName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Partner Status</span>
            <span class="info-value" style="color: #006633;">${status.charAt(0).toUpperCase() + status.slice(1)} ✓</span>
          </div>
          <div class="info-row">
            <span class="info-label">Partner ID</span>
            <span class="info-value" style="font-family: monospace; font-size: 11px;">${partnerId}</span>
          </div>
          <div class="info-row">
            <span class="info-label">MOU Status</span>
            <span class="info-value" style="color: #b45309;">Awaiting Signature</span>
          </div>
        </div>

        <p style="font-size: 13px; color: #777;">After signing, your Partner Dashboard will unlock automatically. If you encounter any issues, contact us at <a href="mailto:admin@civiceducationkenya.com" style="color: #0b2447; font-weight: 700;">admin@civiceducationkenya.com</a>.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Civic Education Kenya Alliance</p>
        <p><a href="https://civiceducationkenya.com">civiceducationkenya.com</a> · <a href="mailto:admin@civiceducationkenya.com">admin@civiceducationkenya.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
