// @ts-nocheck
// D:\CEKA\ceka v010\CEKA\supabase\functions\oauth-token\index.ts
// Secure OAuth 2.0 Token Exchange for CEKA Third Party Apps
// Implements code-for-user-info exchange using client_secret verification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { grant_type, code, client_id, client_secret, redirect_uri } = await req.json()

        // 1. Validate Grant Type
        if (grant_type !== 'authorization_code' && grant_type !== 'code_exchange') {
            return new Response(JSON.stringify({ error: 'unsupported_grant_type' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (!code || !client_id || !client_secret) {
            return new Response(JSON.stringify({ error: 'invalid_request', message: 'Missing required parameters (code, client_id, client_secret)' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 2. Initialize Supabase Admin for CEKA
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole)

        // 3. Authenticate the Client App
        const { data: appData, error: appError } = await supabaseAdmin
            .from('third_party_apps' as any)
            .select('*')
            .eq('client_id', client_id)
            .eq('client_secret', client_secret)
            .single()

        if (appError || !appData) {
            console.error('[OAuth-Token] Invalid client credentials:', client_id)
            return new Response(JSON.stringify({ error: 'invalid_client' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 4. Validate Redirect URI (if provided)
        if (redirect_uri && !appData.redirect_uris.includes(redirect_uri)) {
            return new Response(JSON.stringify({ error: 'invalid_grant', message: 'redirect_uri mismatch' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 5. Decode and Validate Authorization Code
        // Format: btoa(JSON.stringify({ u: user_id, t: timestamp }))
        let decodedCode;
        try {
            decodedCode = JSON.parse(atob(code))
        } catch (e) {
            return new Response(JSON.stringify({ error: 'invalid_grant', message: 'Malformed authorization code' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const userId = decodedCode.u
        const timestamp = decodedCode.t

        // Verify code freshness (max 10 minutes)
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000)
        if (timestamp < tenMinutesAgo) {
            return new Response(JSON.stringify({ error: 'invalid_grant', message: 'Code expired' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 6. Fetch User Identity from CEKA
        const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)

        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'invalid_grant', message: 'User not found' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 7. Successful Exchange - Return User Token Info
        // Note: In a full OAuth server, this would return a JWT. 
        // For the Sandbox integration, we return the verified user identity.
        return new Response(JSON.stringify({
            access_token: crypto.randomUUID(), // Mock access token
            token_type: 'Bearer',
            expires_in: 3600,
            user: {
                id: user.id,
                email: user.email,
                name: user.user_metadata?.full_name || user.email?.split('@')[0],
                avatar_url: user.user_metadata?.avatar_url
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        console.error('[OAuth-Token] Unhandled Error:', error.message)
        return new Response(JSON.stringify({ error: 'server_error', details: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
