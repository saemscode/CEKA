// @ts-nocheck
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailing.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IngestPartnerRequest {
  auth_user_id: string;
  org_name: string;
  org_email: string;
  org_website?: string;
  org_reg_no?: string;
  focus_areas?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Service role client — bypasses ALL RLS policies
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: IngestPartnerRequest = await req.json();
    const { auth_user_id, org_name, org_email, org_website, org_reg_no, focus_areas } = body;

    if (!auth_user_id || !org_name || !org_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: auth_user_id, org_name, org_email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 1. GUARANTEED DB WRITE — service role bypasses RLS entirely
    const { data: partnerRecord, error: dbError } = await supabaseAdmin
      .from('partners')
      .insert({
        org_name,
        org_email,
        org_website: org_website || null,
        submitted_by_user_id: auth_user_id,
        tier: 'free',
        verification_status: 'unverified',
        agreement_signed: false,
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('[ingest-partner-application] DB insert error:', dbError);
      return new Response(
        JSON.stringify({ error: dbError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const partnerId = partnerRecord.id;

    // 2. Insert initial 'ally' role — pending review (service role)
    await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: auth_user_id, role: 'ally' })
      .select();
    // Ignore conflict — if already exists, that's fine

    // 3. Write audit log
    await supabaseAdmin.from('admin_audit_log').insert({
      action: 'partner_application_ingested',
      resource_type: 'partner_application',
      resource_id: partnerId,
      details: { org_name, org_email, org_website: org_website || null, auth_user_id }
    }).select();

    // 4. Email to the applicant: Application Received
    const appUrl = Deno.env.get("SITE_URL") || "https://civiceducationkenya.com";
    const applicantHtml = buildApplicantReceiptEmail(org_name, partnerId);
    try {
      await sendEmail({
        to: [org_email],
        from: { name: "CEKA Partnership Team", email: "welcome@admin.civiceducationkenya.com" },
        subject: `[CEKA] Partnership Application Received — ${org_name}`,
        html: applicantHtml,
        provider: 'auto',
      });
    } catch (emailErr) {
      console.error('[ingest-partner-application] Applicant email failed:', emailErr);
      // Non-fatal — data is already ingested
    }

    // 5. Email admin alert with deep-link to admin console for the specific partner
    const adminReviewLink = `${appUrl}/admin/dashboard?tab=partners&review=${partnerId}`;
    const adminHtml = buildAdminAlertEmail(org_name, org_email, org_website || 'Not provided', org_reg_no || 'Not provided', (focus_areas || []).join(', ') || 'Not specified', partnerId, adminReviewLink);
    try {
      await sendEmail({
        to: ['admin@civiceducationkenya.com', 'civiceducationkenya@gmail.com'],
        from: { name: "CEKA System Alerts", email: "welcome@admin.civiceducationkenya.com" },
        subject: `🚨 New CEKA Partner Application — ${org_name}`,
        html: adminHtml,
        provider: 'auto',
      });
    } catch (emailErr) {
      console.error('[ingest-partner-application] Admin alert email failed:', emailErr);
      // Non-fatal
    }

    return new Response(
      JSON.stringify({ success: true, partner_id: partnerId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("[ingest-partner-application] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ─── Email Templates ──────────────────────────────────────────────────────────

function buildApplicantReceiptEmail(orgName: string, partnerId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CEKA Partnership Application Received</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.7; color: #1a1a1a; margin: 0; padding: 0; background: #f0f4f8; }
    .wrapper { padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.10); }
    .header { background: linear-gradient(135deg, #0b2447 0%, #0f3b7c 60%, #006633 100%); padding: 48px 40px 40px; text-align: center; }
    .header-logo { width: 120px; margin-bottom: 20px; }
    .header h1 { color: #ffffff; font-size: 26px; font-weight: 900; margin: 0 0 8px; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.75); font-size: 14px; margin: 0; font-weight: 500; }
    .body { padding: 40px; }
    .body h2 { font-size: 22px; font-weight: 800; margin: 0 0 12px; color: #0b2447; letter-spacing: -0.3px; }
    .body p { font-size: 15px; color: #444; margin: 0 0 18px; }
    .status-banner { background: linear-gradient(135deg, rgba(11,36,71,0.06), rgba(0,102,51,0.06)); border: 1.5px solid rgba(0,102,51,0.2); border-radius: 16px; padding: 20px 24px; margin: 24px 0; }
    .status-banner .status-icon { font-size: 28px; margin-bottom: 8px; }
    .status-banner .status-title { font-size: 16px; font-weight: 800; color: #0b2447; margin: 0 0 4px; }
    .status-banner .status-desc { font-size: 13px; color: #666; margin: 0; }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #0b2447; }
    .info-value { font-size: 14px; font-weight: 600; color: #1a1a1a; text-align: right; max-width: 280px; word-break: break-all; }
    .info-mono { font-family: 'Courier New', Courier, monospace; font-size: 11px; background: #f5f5f7; padding: 4px 8px; border-radius: 6px; }
    .timeline { margin: 28px 0; }
    .timeline-item { display: flex; gap: 16px; margin-bottom: 16px; }
    .timeline-dot { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; margin-top: 2px; }
    .timeline-dot.done { background: rgba(0,102,51,0.15); }
    .timeline-dot.pending { background: rgba(11,36,71,0.10); }
    .timeline-content .title { font-size: 14px; font-weight: 700; color: #1a1a1a; margin: 0 0 2px; }
    .timeline-content .desc { font-size: 12px; color: #888; margin: 0; }
    .cta-block { text-align: center; margin: 32px 0 8px; }
    .cta { display: inline-block; background: linear-gradient(135deg, #0b2447, #0f3b7c); color: #fff; text-decoration: none; padding: 15px 36px; border-radius: 16px; font-weight: 800; font-size: 14px; letter-spacing: 0.3px; }
    .footer { padding: 28px 40px; background: #fafafa; text-align: center; border-top: 1px solid #eee; }
    .footer p { font-size: 12px; color: #aaa; margin: 4px 0; }
    .footer a { color: #0b2447; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>✅ Application Received</h1>
        <p>CEKA Partnership Program — Kenya's Open Civic Infrastructure</p>
      </div>
      <div class="body">
        <h2>Karibu, ${orgName}!</h2>
        <p>Your organization's application to join the <strong>CEKA Partnership Program</strong> has been successfully received and logged in our secure system. Your details are safe with us.</p>

        <div class="status-banner">
          <div class="status-icon">⏳</div>
          <div class="status-title">Application Under Review</div>
          <div class="status-desc">Our team is currently reviewing your application. Expect a response within 2–5 business days. No action is required from your end at this time.</div>
        </div>

        <div style="margin: 24px 0;">
          <div class="info-row">
            <span class="info-label">Organization</span>
            <span class="info-value">${orgName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Application ID</span>
            <span class="info-value"><span class="info-mono">${partnerId}</span></span>
          </div>
          <div class="info-row">
            <span class="info-label">Submitted</span>
            <span class="info-value">${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'long', timeStyle: 'short' })} EAT</span>
          </div>
          <div class="info-row">
            <span class="info-label">Current Status</span>
            <span class="info-value" style="color: #b45309; font-weight: 800;">Pending Review</span>
          </div>
        </div>

        <p style="font-size: 14px; color: #555; font-weight: 500; border-left: 3px solid #006633; padding-left: 14px; margin: 24px 0;">Applications are reviewed under the <strong>Data Protection Act (2019)</strong>. Admission is not automatic; official partner status is pending review, verification, and co-signing of the CEKA Partnership MOU Agreement.</p>

        <div class="timeline">
          <div class="timeline-item">
            <div class="timeline-dot done">✅</div>
            <div class="timeline-content">
              <div class="title">Application Submitted</div>
              <div class="desc">Your details are securely stored in our system.</div>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-dot pending">🔍</div>
            <div class="timeline-content">
              <div class="title">CEKA Review</div>
              <div class="desc">Our team will review your organization's credentials and civic mandate.</div>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-dot pending">📋</div>
            <div class="timeline-content">
              <div class="title">MOU Agreement Signing</div>
              <div class="desc">Upon approval, you will be invited to review and digitally sign the CEKA Partnership MOU.</div>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-dot pending">🤝</div>
            <div class="timeline-content">
              <div class="title">Full Partner Access Granted</div>
              <div class="desc">Dashboard, co-branding tools, and collaboration capabilities unlocked.</div>
            </div>
          </div>
        </div>

        <p>For any queries, email us directly at <a href="mailto:admin@civiceducationkenya.com" style="color: #0b2447; font-weight: 700;">admin@civiceducationkenya.com</a> quoting your Application ID above.</p>

        <div class="cta-block">
          <a href="https://civiceducationkenya.com" class="cta">Explore CEKA →</a>
        </div>
      </div>
      <div class="footer">
        <p>You received this because ${orgName} submitted a CEKA Partnership application.</p>
        <p><a href="https://civiceducationkenya.com">civiceducationkenya.com</a> · <a href="mailto:admin@civiceducationkenya.com">admin@civiceducationkenya.com</a></p>
        <p style="margin-top: 12px; color: #ccc;">© ${new Date().getFullYear()} Civic Education Kenya Alliance · Republic of Kenya</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildAdminAlertEmail(
  orgName: string,
  orgEmail: string,
  orgWebsite: string,
  orgRegNo: string,
  focusAreas: string,
  partnerId: string,
  adminReviewLink: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New CEKA Partner Application Alert</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background: #f0f4f8; }
    .wrapper { padding: 30px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 6px 30px rgba(0,0,0,0.10); }
    .header { background: #0b2447; padding: 28px 32px; display: flex; align-items: center; gap: 14px; }
    .header-icon { width: 44px; height: 44px; background: rgba(255,255,255,0.12); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
    .header h1 { color: #fff; font-size: 20px; font-weight: 900; margin: 0; letter-spacing: -0.3px; }
    .header p { color: rgba(255,255,255,0.6); font-size: 12px; margin: 2px 0 0; }
    .body { padding: 32px; }
    .alert-badge { display: inline-block; background: rgba(234,88,12,0.12); color: #ea580c; border: 1.5px solid rgba(234,88,12,0.25); border-radius: 99px; padding: 6px 16px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 20px; }
    .field { margin-bottom: 12px; padding: 14px 16px; background: #f8f9fb; border-radius: 12px; border-left: 3px solid #0b2447; }
    .field-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #0b2447; margin-bottom: 5px; }
    .field-value { font-size: 15px; color: #1a1a1a; font-weight: 600; }
    .field-mono { font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #555; }
    .cta-block { margin: 28px 0 12px; text-align: center; }
    .cta { display: inline-block; background: linear-gradient(135deg, #006633, #004d26); color: #fff; text-decoration: none; padding: 16px 40px; border-radius: 16px; font-weight: 800; font-size: 15px; letter-spacing: 0.2px; }
    .cta-sub { font-size: 11px; color: #999; margin-top: 10px; }
    .footer { padding: 20px 32px; background: #fafafa; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #aaa; }
    .footer a { color: #0b2447; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="header-icon">🚨</div>
        <div>
          <h1>New Partner Application</h1>
          <p>Action Required — CEKA Partnership Program</p>
        </div>
      </div>
      <div class="body">
        <span class="alert-badge">⚡ Requires Admin Review</span>

        <div class="field">
          <div class="field-label">Organization Name</div>
          <div class="field-value">${orgName}</div>
        </div>
        <div class="field">
          <div class="field-label">Contact Email</div>
          <div class="field-value"><a href="mailto:${orgEmail}" style="color: #0b2447;">${orgEmail}</a></div>
        </div>
        <div class="field">
          <div class="field-label">Website</div>
          <div class="field-value">${orgWebsite !== 'Not provided' ? `<a href="${orgWebsite}" target="_blank" style="color: #0b2447;">${orgWebsite}</a>` : 'Not provided'}</div>
        </div>
        <div class="field">
          <div class="field-label">Registration Number</div>
          <div class="field-value">${orgRegNo}</div>
        </div>
        <div class="field">
          <div class="field-label">Focus Areas</div>
          <div class="field-value" style="font-size: 14px;">${focusAreas}</div>
        </div>
        <div class="field">
          <div class="field-label">Partner ID (Database Reference)</div>
          <div class="field-mono">${partnerId}</div>
        </div>
        <div class="field">
          <div class="field-label">Submitted At</div>
          <div class="field-value">${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'full', timeStyle: 'medium' })} EAT</div>
        </div>

        <div class="cta-block">
          <a href="${adminReviewLink}" class="cta">Review &amp; Approve Application →</a>
          <p class="cta-sub">This link takes you directly to this partner's record in the CEKA Admin Console.</p>
        </div>

        <p style="font-size: 13px; color: #777; text-align: center;">To approve: set Verification Status to <strong>"Credible"</strong> or higher. This will trigger the MOU signing email to the partner automatically.</p>
      </div>
      <div class="footer">
        <p>CEKA System Alert · <a href="https://civiceducationkenya.com/admin/dashboard">Admin Console</a></p>
        <p style="margin-top: 6px; color: #ccc;">© ${new Date().getFullYear()} Civic Education Kenya Alliance</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
