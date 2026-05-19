import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailing.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VolunteerConfirmationRequest {
  type: 'application_received' | 'status_update' | 'retroactive_update';
  applicant_email: string;
  applicant_name: string;
  opportunity_title: string;
  opportunity_organization?: string;
  application_id: string;
  new_status?: string; // approved | rejected | waitlisted
  admin_message?: string;
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

    const body: VolunteerConfirmationRequest = await req.json();
    const {
      type,
      applicant_email,
      applicant_name,
      opportunity_title,
      opportunity_organization,
      application_id,
      new_status,
      admin_message
    } = body;

    let emailHtml = '';
    let emailSubject = '';

    if (type === 'application_received') {
      emailSubject = `Application Received — ${opportunity_title}`;
      emailHtml = buildApplicationReceivedEmail(applicant_name, opportunity_title, opportunity_organization || 'CEKA', application_id);

      // Also notify admin
      await sendEmail({
        to: ['civiceducationkenya@gmail.com'],
        subject: `New Volunteer Application: ${applicant_name} → ${opportunity_title}`,
        html: buildAdminNotificationEmail(applicant_name, applicant_email, opportunity_title, application_id),
        provider: 'auto'
      });

    } else if (type === 'status_update') {
      const statusLabel = new_status === 'approved' ? 'Accepted' : new_status === 'rejected' ? 'Not Selected' : 'Waitlisted';
      emailSubject = `Application ${statusLabel} — ${opportunity_title}`;
      emailHtml = buildStatusUpdateEmail(applicant_name, opportunity_title, opportunity_organization || 'CEKA', new_status || 'pending', admin_message);

    } else if (type === 'retroactive_update') {
      emailSubject = `Update on Your Volunteer Application — ${opportunity_title}`;
      emailHtml = buildRetroactiveUpdateEmail(applicant_name, opportunity_title, opportunity_organization || 'CEKA', application_id);
    }

    // Send the email
    await sendEmail({
      to: [applicant_email],
      subject: emailSubject,
      html: emailHtml,
      provider: 'auto'
    });

    // Log to audit
    await supabase.from("admin_audit_log").insert({
      action: "volunteer_email_sent",
      resource_type: "volunteer_application",
      resource_id: application_id,
      details: { type, applicant_email, opportunity_title, new_status }
    });

    return new Response(
      JSON.stringify({ success: true, type, applicant_email }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("send-volunteer-confirmation error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ─── Email Templates ────────────────────────────────────────────────────────

function buildApplicationReceivedEmail(name: string, title: string, org: string, appId: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Received</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background: #f5f5f7; }
    .container { max-width: 580px; margin: 40px auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #006633 0%, #00994d 100%); padding: 40px 32px; text-align: center; }
    .header h1 { color: #fff; font-size: 24px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.85); font-size: 14px; margin: 0; }
    .body { padding: 40px 32px; }
    .body h2 { font-size: 20px; font-weight: 700; margin: 0 0 16px 0; color: #1a1a1a; }
    .body p { font-size: 15px; color: #555; margin: 0 0 16px 0; }
    .info-card { background: #f5f5f7; border-radius: 16px; padding: 20px; margin: 24px 0; }
    .info-card .label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #006633; margin-bottom: 6px; }
    .info-card .value { font-size: 16px; font-weight: 600; color: #1a1a1a; }
    .cta { display: inline-block; background: #006633; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 14px; font-weight: 700; font-size: 14px; margin-top: 16px; }
    .footer { padding: 24px 32px; background: #fafafa; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Application Received</h1>
      <p>Civic Education Kenya Alliance</p>
    </div>
    <div class="body">
      <h2>Karibu, ${name}!</h2>
      <p>Your volunteer application has been successfully submitted and is now under review by the CEKA admin team.</p>
      <div class="info-card">
        <div class="label">Opportunity</div>
        <div class="value">${title}</div>
      </div>
      <div class="info-card">
        <div class="label">Organization</div>
        <div class="value">${org}</div>
      </div>
      <div class="info-card">
        <div class="label">Application ID</div>
        <div class="value" style="font-size: 13px; font-family: monospace;">${appId}</div>
      </div>
      <p>We will review your application and notify you of the outcome via email and through your CEKA notifications. This typically takes 2–5 business days.</p>
      <a href="https://ceka.co.ke/community" class="cta">Visit CEKA Community →</a>
    </div>
    <div class="footer">
      <p>You received this email because you applied for a volunteer opportunity on CEKA.</p>
      <p>© ${new Date().getFullYear()} Civic Education Kenya Alliance</p>
    </div>
  </div>
</body>
</html>`;
}

function buildStatusUpdateEmail(name: string, title: string, org: string, status: string, adminMsg?: string): string {
  const statusConfig: Record<string, { emoji: string; heading: string; color: string; message: string }> = {
    approved: {
      emoji: '🎉',
      heading: 'Congratulations!',
      color: '#006633',
      message: `Your application to volunteer for <strong>"${title}"</strong> with ${org} has been <strong>accepted</strong>. Welcome aboard! The team will be reaching out to you shortly with next steps.`
    },
    rejected: {
      emoji: '🙏',
      heading: 'Application Update',
      color: '#dc3545',
      message: `Thank you for your interest in volunteering for <strong>"${title}"</strong>. After careful review, we were unable to proceed with your application at this time. We encourage you to explore other opportunities on the CEKA platform.`
    },
    waitlisted: {
      emoji: '⏳',
      heading: 'You\'re on the Waitlist',
      color: '#f59e0b',
      message: `Your application to volunteer for <strong>"${title}"</strong> has been placed on our waitlist. If a spot opens up, you'll be the first to know. In the meantime, check out other opportunities!`
    }
  };

  const config = statusConfig[status] || statusConfig['waitlisted'];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application ${status}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background: #f5f5f7; }
    .container { max-width: 580px; margin: 40px auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: ${config.color}; padding: 40px 32px; text-align: center; }
    .header h1 { color: #fff; font-size: 24px; font-weight: 800; margin: 0 0 8px 0; }
    .header p { color: rgba(255,255,255,0.85); font-size: 14px; margin: 0; }
    .body { padding: 40px 32px; }
    .body h2 { font-size: 20px; font-weight: 700; margin: 0 0 16px 0; }
    .body p { font-size: 15px; color: #555; margin: 0 0 16px 0; }
    .admin-note { background: #f0f7ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 0 12px 12px 0; margin: 20px 0; }
    .admin-note .label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #3b82f6; margin-bottom: 6px; }
    .cta { display: inline-block; background: #006633; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 14px; font-weight: 700; font-size: 14px; margin-top: 16px; }
    .footer { padding: 24px 32px; background: #fafafa; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${config.emoji} ${config.heading}</h1>
      <p>Volunteer Application Update</p>
    </div>
    <div class="body">
      <h2>Hello, ${name}</h2>
      <p>${config.message}</p>
      ${adminMsg ? `<div class="admin-note"><div class="label">Note from Admin</div><p style="margin:0;font-size:14px;color:#333;">${adminMsg}</p></div>` : ''}
      <a href="https://ceka.co.ke/join-community?tab=volunteer" class="cta">Browse Opportunities →</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Civic Education Kenya Alliance</p>
    </div>
  </div>
</body>
</html>`;
}

function buildRetroactiveUpdateEmail(name: string, title: string, org: string, appId: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Update</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background: #f5f5f7; }
    .container { max-width: 580px; margin: 40px auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #006633 0%, #00994d 100%); padding: 40px 32px; text-align: center; }
    .header h1 { color: #fff; font-size: 24px; font-weight: 800; margin: 0 0 8px 0; }
    .header p { color: rgba(255,255,255,0.85); font-size: 14px; margin: 0; }
    .body { padding: 40px 32px; }
    .body h2 { font-size: 20px; font-weight: 700; margin: 0 0 16px 0; }
    .body p { font-size: 15px; color: #555; margin: 0 0 16px 0; }
    .info-card { background: #f5f5f7; border-radius: 16px; padding: 20px; margin: 24px 0; }
    .info-card .label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #006633; margin-bottom: 6px; }
    .info-card .value { font-size: 16px; font-weight: 600; color: #1a1a1a; }
    .perk-list { background: #f0fdf4; border-radius: 16px; padding: 20px; margin: 24px 0; }
    .perk-list h3 { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #006633; margin: 0 0 12px 0; }
    .perk-list ul { margin: 0; padding-left: 20px; }
    .perk-list li { font-size: 14px; color: #333; margin-bottom: 8px; }
    .cta { display: inline-block; background: #006633; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 14px; font-weight: 700; font-size: 14px; margin-top: 16px; }
    .footer { padding: 24px 32px; background: #fafafa; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📬 Application Update</h1>
      <p>Civic Education Kenya Alliance</p>
    </div>
    <div class="body">
      <h2>Hey ${name}!</h2>
      <p>We're following up on your volunteer application for <strong>"${title}"</strong> with ${org}. We've upgraded our volunteer management system and wanted to make sure you're in the loop.</p>
      <div class="info-card">
        <div class="label">Application ID</div>
        <div class="value" style="font-size: 13px; font-family: monospace;">${appId}</div>
      </div>
      <div class="perk-list">
        <h3>What's New for You</h3>
        <ul>
          <li>Real-time status updates on your application</li>
          <li>In-app notifications when your status changes</li>
          <li>Direct communication with the CEKA admin team</li>
          <li>Access to more volunteer opportunities</li>
        </ul>
      </div>
      <p>Your application is being actively reviewed. You'll receive a notification the moment there's an update.</p>
      <a href="https://ceka.co.ke/community" class="cta">Check Your Status →</a>
    </div>
    <div class="footer">
      <p>You applied for a volunteer opportunity on CEKA. This is a one-time follow-up.</p>
      <p>© ${new Date().getFullYear()} Civic Education Kenya Alliance</p>
    </div>
  </div>
</body>
</html>`;
}

function buildAdminNotificationEmail(name: string, email: string, title: string, appId: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 580px; margin: 20px auto; padding: 20px; }
    .header { background: #006633; color: white; padding: 20px; border-radius: 12px 12px 0 0; }
    .content { background: #f9f9f9; padding: 24px; border-radius: 0 0 12px 12px; }
    .field { margin-bottom: 12px; padding: 12px; background: white; border-radius: 8px; border-left: 3px solid #006633; }
    .field-label { font-weight: 700; color: #006633; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
    .field-value { font-size: 15px; color: #333; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin:0;">🆕 New Volunteer Application</h2>
    </div>
    <div class="content">
      <div class="field"><div class="field-label">Applicant</div><div class="field-value">${name}</div></div>
      <div class="field"><div class="field-label">Email</div><div class="field-value">${email}</div></div>
      <div class="field"><div class="field-label">Opportunity</div><div class="field-value">${title}</div></div>
      <div class="field"><div class="field-label">Application ID</div><div class="field-value" style="font-family: monospace; font-size: 12px;">${appId}</div></div>
      <div class="field"><div class="field-label">Submitted</div><div class="field-value">${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })} EAT</div></div>
      <p style="margin-top:16px;font-size:13px;color:#666;">Review this application in the <a href="https://ceka.co.ke/admin/dashboard" style="color:#006633;font-weight:700;">Admin Dashboard</a>.</p>
    </div>
  </div>
</body>
</html>`;
}
