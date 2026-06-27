import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailing.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PartnerWelcomeRequest {
  partner_id: string;
  org_name: string;
  org_email: string;
  org_website?: string;
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

    const body: PartnerWelcomeRequest = await req.json();
    const { partner_id, org_name, org_email, org_website } = body;

    if (!partner_id || !org_name || !org_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 1. Send welcoming email to applicant
    const applicantSubject = `CEKA Partnership Program Application Received: ${org_name}`;
    const applicantHtml = buildApplicantWelcomeEmail(org_name, partner_id);
    
    await sendEmail({
      to: [org_email],
      subject: applicantSubject,
      html: applicantHtml,
      provider: 'auto'
    });

    // 2. Send internal alert to CEKA Admin
    const adminSubject = `🚨 New CEKA Partner Application: ${org_name}`;
    const adminHtml = buildAdminAlertEmail(org_name, org_email, org_website || 'Not provided', partner_id);

    await sendEmail({
      to: ['admin@civiceducationkenya.com', 'civiceducationkenya@gmail.com'],
      subject: adminSubject,
      html: adminHtml,
      provider: 'auto'
    });

    // 3. Log to audit
    await supabase.from("admin_audit_log").insert({
      action: "partner_welcome_email_sent",
      resource_type: "partner_application",
      resource_id: partner_id,
      details: { org_name, org_email, org_website }
    });

    return new Response(
      JSON.stringify({ success: true, partner_id, org_email }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("send-partner-welcome error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ─── Email Templates ────────────────────────────────────────────────────────

function buildApplicantWelcomeEmail(name: string, partnerId: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the CEKA Partnership Program</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background: #f5f5f7; }
    .container { max-width: 580px; margin: 40px auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #0b2447 0%, #0f3b7c 100%); padding: 40px 32px; text-align: center; }
    .header h1 { color: #fff; font-size: 24px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.85); font-size: 14px; margin: 0; }
    .body { padding: 40px 32px; }
    .body h2 { font-size: 20px; font-weight: 700; margin: 0 0 16px 0; color: #1a1a1a; }
    .body p { font-size: 15px; color: #555; margin: 0 0 16px 0; }
    .info-card { background: #f5f5f7; border-radius: 16px; padding: 20px; margin: 24px 0; }
    .info-card .label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #0b2447; margin-bottom: 6px; }
    .info-card .value { font-size: 16px; font-weight: 600; color: #1a1a1a; }
    .cta { display: inline-block; background: #006633; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 14px; font-weight: 700; font-size: 14px; margin-top: 16px; }
    .footer { padding: 24px 32px; background: #fafafa; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👥 Application Received</h1>
      <p>CEKA Partnership Program</p>
    </div>
    <div class="body">
      <h2>Karibu, ${name}!</h2>
      <p>We have successfully received your organization's request to join the CEKA Partnership Program. Your application is now in our verification queue.</p>
      
      <div class="info-card">
        <div class="label">Organization Name</div>
        <div class="value">${name}</div>
      </div>
      <div class="info-card">
        <div class="label">Application Reference ID</div>
        <div class="value" style="font-size: 13px; font-family: monospace;">${partnerId}</div>
      </div>

      <p>Applications are reviewed under the <strong>Data Protection Act (2019)</strong>. Admission is not automatic; official status is pending review, verification, and co-signing of the CEKA Partnership Agreement.</p>
      
      <p>If you have any questions or would like to expedite the process, please contact us at <strong>admin@civiceducationkenya.com</strong>.</p>
      
      <a href="https://civiceducationkenya.com/" class="cta">Explore CEKA →</a>
    </div>
    <div class="footer">
      <p>You received this email because your organization applied for the CEKA Partnership Program.</p>
      <p>© ${new Date().getFullYear()} Civic Education Kenya Alliance</p>
    </div>
  </div>
</body>
</html>`;
}

function buildAdminAlertEmail(name: string, email: string, website: string, partnerId: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 580px; margin: 20px auto; padding: 20px; }
    .header { background: #0b2447; color: white; padding: 20px; border-radius: 12px 12px 0 0; }
    .content { background: #f9f9f9; padding: 24px; border-radius: 0 0 12px 12px; }
    .field { margin-bottom: 12px; padding: 12px; background: white; border-radius: 8px; border-left: 3px solid #0b2447; }
    .field-label { font-weight: 700; color: #0b2447; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
    .field-value { font-size: 15px; color: #333; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin:0;">🚨 New Partner Application</h2>
    </div>
    <div class="content">
      <div class="field"><div class="field-label">Organization Name</div><div class="field-value">${name}</div></div>
      <div class="field"><div class="field-label">Contact Email</div><div class="field-value">${email}</div></div>
      <div class="field"><div class="field-label">Website</div><div class="field-value">${website}</div></div>
      <div class="field"><div class="field-label">Partner ID</div><div class="field-value" style="font-family: monospace; font-size: 12px;">${partnerId}</div></div>
      <div class="field"><div class="field-label">Submitted</div><div class="field-value">${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })} EAT</div></div>
      <p style="margin-top:16px;font-size:13px;color:#666;">You can promote or reject this partner's status directly in the <strong>Admin Console > Partners Tab</strong>.</p>
    </div>
  </div>
</body>
</html>`;
}
