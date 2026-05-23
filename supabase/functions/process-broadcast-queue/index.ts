// @ts-nocheck


import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('VITE_RESEND_API_KEY');
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
        const { record } = await req.json(); // Triggered by DB Webhook
        if (!record) throw new Error('No record provided');

        const { id, recipient_email, recipient_name, personalization_data, broadcast_id } = record;

        // 1. Get Broadcast Metadata
        const { data: bc, error: bcError } = await supabase
            .from('broadcast_history')
            .select('subject, content_raw')
            .eq('id', broadcast_id)
            .single();

        if (bcError || !bc) throw new Error('Broadcast history not found');

        // 2. Personalization Engine (with "fellow citizen" fallback and Smart-Case support)
        let htmlContent = bc.content_raw;
        const tagsMapping = {
            'first_name': recipient_name || 'fellow citizen',
            'last_name': personalization_data?.last_name || '',
            'display_name': personalization_data?.display_name || 'fellow citizen',
            'county': personalization_data?.county || 'county in Kenya',
            'interests': personalization_data?.interests || 'civic interests'
        };

        Object.entries(tagsMapping).forEach(([key, value]) => {
            // Standard lowercase replacement: {{first_name}} -> "fellow citizen"
            htmlContent = htmlContent.replaceAll(`{{${key}}}`, value);

            // Smart Sentence-Case replacement: {{First_name}} -> "Fellow citizen"
            const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
            const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
            htmlContent = htmlContent.replaceAll(`{{${capitalizedKey}}}`, capitalizedValue);
        });

        // 3. Email-Safe HTML Wrapper
        const finalHtml = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a202c; max-width: 600px; margin: 0 auto; padding: 20px; }
                        h1, h2, h3 { border-bottom: 2px solid #24a148; padding-bottom: 8px; color: #2D3748; }
                        hr { border: 0; border-top: 1px solid #E2E8F0; margin: 24px 0; }
                        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #718096; text-align: center; }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                    <div class="footer">
                        Sent via email for CEKA Community only<br>
                        Educate. Amplify. Empower.
                    </div>
                </body>
            </html>
        `;

        // 4. Mailing Mesh Logic (Resend -> Brevo)
        let provider = 'resend';
        let sent = false;
        let errorMsg = '';

        // Check Mesh Status (Smart Routing)
        const { data: mesh } = await supabase.rpc('get_mailing_mesh_status');
        if (mesh && mesh.resend_today >= mesh.resend_limit) {
            provider = 'brevo';
        }

        try {
            if (provider === 'resend' && RESEND_API_KEY) {
                const res = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
                    body: JSON.stringify({
                        from: 'CEKA <admin@civiceducationkenya.com>',
                        to: [recipient_email],
                        subject: bc.subject,
                        html: finalHtml,
                    }),
                });
                if (!res.ok) throw new Error(await res.text());
                sent = true;
            } else if (BREVO_API_KEY) {
                provider = 'brevo';
                const res = await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
                    body: JSON.stringify({
                        sender: { name: 'CEKA', email: 'admin@civiceducationkenya.com' },
                        to: [{ email: recipient_email }],
                        subject: bc.subject,
                        htmlContent: finalHtml,
                    }),
                });
                if (!res.ok) throw new Error(await res.text());
                sent = true;
            }
        } catch (mailError: any) {
            errorMsg = mailError.message;
            // Immediate Failover to Brevo if Resend fails
            if (provider === 'resend' && BREVO_API_KEY) {
                provider = 'brevo';
                const res = await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
                    body: JSON.stringify({
                        sender: { name: 'CEKA', email: 'admin@civiceducationkenya.com' },
                        to: [{ email: recipient_email }],
                        subject: bc.subject,
                        htmlContent: finalHtml,
                    }),
                });
                if (res.ok) {
                    sent = true;
                    errorMsg = '';
                }
            }
        }

        // 5. Update Queue Status & Audit
        await supabase.from('broadcast_queue').update({
            status: sent ? 'sent' : 'failed',
            error_message: errorMsg,
            provider_used: provider,
            sent_at: sent ? new Date().toISOString() : null
        }).eq('id', id);

        if (sent) {
            await supabase.from('admin_audit_log').insert({
                action: `broadcast_sent_${provider}`,
                details: { recipient: recipient_email, broadcast_id }
            });
        }

        return new Response(JSON.stringify({ success: sent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
