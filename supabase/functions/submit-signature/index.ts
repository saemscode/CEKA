// @ts-nocheck


import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from "../_shared/mailing.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Use service key to bypass RLS for OTP setup
    );

    const { bill_id, template_id, name, email, county, constituency, comments } = await req.json();

    // 1. Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Atomic Upsert: Insert new or Update existing with New OTP
    const { data: signature, error: sigError } = await supabase
      .from('signatures')
      .upsert({
        bill_id,
        template_id: template_id || null,
        full_name: name,
        email: email.toLowerCase().trim(),
        county,
        constituency,
        comments,
        otp_code: otpCode,
        is_verified: false // Reset verification status to allow new attempt
      }, {
        onConflict: 'bill_id,email'
      })
      .select('id')
      .single();

    if (sigError) {
      console.error('[submit-signature] Critical DB Error:', sigError);
      throw sigError;
    }

    // 3. Send Verification Email via Mailing Mesh (Non-blocking fallback)
    try {
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #000; color: #fff; padding: 40px; border-radius: 24px;">
          <h1 style="color: #006633; font-size: 32px; font-weight: 900; margin-bottom: 8px;">Verification Required</h1>
          <p style="color: #666; font-size: 16px; margin-bottom: 32px;">Enter the following code to confirm your signature on the Bill feedback.</p>
          <p style="color: #666; font-size: 16px; margin-bottom: 32px;">Copy the code below</p>
          
          <div style="background-color: #111; padding: 24px; border-radius: 16px; text-align: center; border: 1px solid #222;">
            <span style="font-size: 48px; font-weight: 900; letter-spacing: 8px; color: #fff;">${otpCode}</span>
          </div>
          
          <p style="color: #444; font-size: 12px; margin-top: 32px; text-transform: uppercase; letter-spacing: 2px;">Powered by CEKA Community</p>
        </div>
      `;

      await sendEmail({
        to: email,
        subject: `CEKA: Verification Code`,
        html: emailHtml,
        provider: 'auto'
      });
    } catch (mailError: any) {
      // Log the error but do NOT throw. We want the user to proceed to handleFinalDispatch
      // even if the verification email is currently unavailable.
      console.warn('[submit-signature] Mailing Mesh exhausted or failed. Proceeding via bypass.', mailError.message);
    }

    return new Response(JSON.stringify({
      success: true,
      id: signature.id,
      meta: { mailing: 'bypassed_on_failure' }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('Signature process error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
