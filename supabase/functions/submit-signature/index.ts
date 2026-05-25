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
    
    // 1. Atomic Upsert: Insert new or Update existing as Verified Immediately (No OTP required)
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
        otp_code: null, // No OTP generated
        is_verified: true // Instantly verified for maximum speed
      }, {
        onConflict: 'bill_id,email'
      })
      .select('id')
      .single();

    if (sigError) {
      console.error('[submit-signature] Critical DB Error:', sigError);
      throw sigError;
    }

    // 2. Email Verification Bypassed - Returning Success Immediately
    return new Response(JSON.stringify({
      success: true,
      id: signature.id,
      meta: { mailing: 'skipped_per_strict_mode' }
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
