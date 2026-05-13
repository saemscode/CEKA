import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from "../_shared/mailing.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Use service key to bypass RLS for OTP setup
    );

    const { bill_id, template_id, name, email, county, constituency, comments } = await req.json();

    // 1. Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Insert into signatures table with the OTP
    const { data: signature, error: sigError } = await supabase
      .from('signatures')
      .insert({
        bill_id,
        template_id: template_id || null,
        full_name: name,
        email: email.toLowerCase().trim(),
        county,
        constituency,
        comments,
        otp_code: otpCode,
        is_verified: false
      })
      .select('id')
      .single();

    if (sigError) {
      if (sigError.code === '23505') {
        return new Response(JSON.stringify({ error: 'Already signed', code: '23505' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw sigError;
    }

    // 3. Send Verification Email via Mailing Mesh
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #000; color: #fff; padding: 40px; border-radius: 24px;">
        <h1 style="color: #006633; font-size: 32px; font-weight: 900; margin-bottom: 8px;">Verification Required</h1>
        <p style="color: #666; font-size: 16px; margin-bottom: 32px;">Enter the following code to confirm your signature on the legislative memorandum.</p>
        
        <div style="background-color: #111; padding: 24px; border-radius: 16px; text-align: center; border: 1px solid #222;">
          <span style="font-size: 48px; font-weight: 900; letter-spacing: 8px; color: #fff;">${otpCode}</span>
        </div>
        
        <p style="color: #444; font-size: 12px; margin-top: 32px; text-transform: uppercase; letter-spacing: 2px;">Powered by CEKA Sovereign Mesh</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `CEKA: Verification Code ${otpCode}`,
      html: emailHtml,
      provider: 'auto' // Use Resend -> Brevo failover
    });

    return new Response(JSON.stringify({ success: true, id: signature.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Signature process error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
