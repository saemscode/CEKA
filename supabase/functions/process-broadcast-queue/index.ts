// @ts-nocheck
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { marked } from "https://esm.sh/marked@12.0.0"
import { sendEmail } from "../_shared/mailing.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Robust Personalization Engine
function personalize(text: string, mapping: Record<string, string>) {
    let result = text;
    
    // Tag Aliases
    const fullMapping = {
        ...mapping,
        'Full_name': mapping.display_name,
        'FullName': mapping.display_name,
        'full_name': mapping.display_name,
        'FirstName': mapping.first_name,
        'LastName': mapping.last_name,
    };

    Object.entries(fullMapping).forEach(([key, value]) => {
        const val = value || '';
        // Case-Insensitive Global Replacement for {{tag}}
        const regex = new RegExp(`{{${key}}}`, 'gi');
        result = result.replace(regex, (match) => {
            // If the tag in the text started with Uppercase, try to uppercase the result
            if (match.startsWith('{{') && match[2] === match[2].toUpperCase()) {
                return val.charAt(0).toUpperCase() + val.slice(1);
            }
            return val;
        });
    });
    
    return result;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
        const { record } = await req.json();
        if (!record) throw new Error('No record provided');

        const { id, recipient_email, recipient_name, personalization_data, broadcast_id } = record;

        // 1. Get Broadcast Metadata
        const { data: bc, error: bcError } = await supabase
            .from('broadcast_history')
            .select('subject, content_raw')
            .eq('id', broadcast_id)
            .single();

        if (bcError || !bc) throw new Error('Broadcast history not found');

        // 2. Prepare Data Mapping
        const mapping = {
            'first_name': recipient_name || 'fellow citizen',
            'last_name': personalization_data?.last_name || '',
            'display_name': personalization_data?.display_name || personalization_data?.full_name || recipient_name || 'fellow citizen',
            'county': personalization_data?.county || 'Kenya',
            'interests': personalization_data?.interests || 'civic matters'
        };

        // 3. Personalize Subject & Content
        const personalizedSubject = personalize(bc.subject, mapping);
        const personalizedMarkdown = personalize(bc.content_raw, mapping);

        // 4. Convert Markdown to HTML
        const htmlBody = await marked.parse(personalizedMarkdown);

        // 5. Email-Safe HTML Wrapper
        const finalHtml = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                            line-height: 1.8; 
                            color: #2D3748; 
                            max-width: 600px; 
                            margin: 0 auto; 
                            padding: 40px 20px; 
                        }
                        h1, h2, h3 { color: #1a202c; margin-top: 1.5em; font-weight: 800; }
                        h1 { font-size: 24px; border-bottom: 4px solid #006633; padding-bottom: 10px; }
                        h2 { font-size: 20px; border-bottom: 2px solid #006633; padding-bottom: 5px; }
                        p { margin-bottom: 1.25em; }
                        a { color: #006633; font-weight: bold; text-decoration: none; }
                        a:hover { text-decoration: underline; }
                        hr { border: 0; border-top: 1px solid #E2E8F0; margin: 30px 0; }
                        .footer { 
                            margin-top: 50px; 
                            padding-top: 25px; 
                            border-top: 1px solid #E2E8F0; 
                            font-size: 11px; 
                            color: #718096; 
                            text-align: center; 
                            letter-spacing: 0.05em;
                            text-transform: uppercase;
                        }
                        .brand { font-weight: 900; color: #006633; display: block; margin-bottom: 5px; }
                    </style>
                </head>
                <body>
                    ${htmlBody}
                    <div class="footer">
                        <span class="brand">Civic Education Kenya (CEKA)</span>
                        Sent to the CEKA Community • Educate. Amplify. Empower.<br>
                        Nairobi, Kenya
                    </div>
                </body>
            </html>
        `;

        // 6. Unified Mailing Mesh Delivery [STRICT MODE]
        let sent = false;
        let errorMsg = '';
        let meshMetadata: any = {};

        try {
            const result = await sendEmail({
                to: recipient_email,
                subject: personalizedSubject,
                html: finalHtml,
                from: { name: 'CEKA', email: 'admin@civiceducationkenya.com' },
                provider: 'auto'
            });
            sent = true;
            meshMetadata = result;
        } catch (mailError: any) {
            errorMsg = mailError.message;
            console.error(`[MailingMesh] Delivery FAILED for ${recipient_email}:`, errorMsg);
        }

        // 7. Update Queue Status with Mesh Performance Data
        await supabase.from('broadcast_queue').update({
            status: sent ? 'sent' : 'failed',
            error_message: errorMsg,
            provider_used: meshMetadata.bypassed ? 'emergency_bypass' : (meshMetadata.id ? 'fleet_member' : 'unknown'),
            sent_at: sent ? new Date().toISOString() : null
        }).eq('id', id);

        // 8. High-Fidelity Audit Log Entry
        await supabase.from('admin_audit_log').insert({
            action: sent ? 'broadcast_sent_success' : 'broadcast_sent_failure',
            resource_type: 'broadcast',
            resource_id: broadcast_id,
            details: { 
                recipient: recipient_email, 
                error: errorMsg,
                mesh_status: sent ? 'delivered' : 'failed',
                bypassed: !!meshMetadata.bypassed,
                timestamp: new Date().toISOString()
            }
        });

        return new Response(JSON.stringify({ success: sent, bypassed: !!meshMetadata.bypassed }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });

    } catch (error: any) {
        console.error('[ProcessQueue Critical Error]', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

