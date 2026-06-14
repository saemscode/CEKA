// supabase/functions/vault-auth/index.ts
// @ts-nocheck (optional)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { S3Client, GetObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.525.0';
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner@3.525.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
  'X-RateLimit-Limit': '100',
  'X-RateLimit-Remaining': '99',
};

interface VaultRequest {
  file_path: string;
  expires_in?: number; // optional, max 7200 seconds (2 hours)
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    // 1. Authenticate user via Supabase Auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.log(`[${requestId}] Auth failed:`, authError?.message || 'No user');
      throw new Error('Unauthorized - Please sign in to access documents');
    }

    // 2. Parse request body
    const body: VaultRequest = await req.json();
    const { file_path, expires_in } = body;
    if (!file_path) {
      throw new Error('file_path is required');
    }

    // Basic path security
    if (file_path.includes('..') || file_path.startsWith('/')) {
      console.log(`[${requestId}] Invalid path attempt: ${file_path}`);
      throw new Error('Invalid file path');
    }

    const expirySeconds = Math.min(expires_in || 3600, 7200);

    // 3. Create S3 client for Backblaze B2
    const s3Client = new S3Client({
      endpoint: Deno.env.get('B2_S3_ENDPOINT'),
      region: 'us-west-004', // or your bucket's region (e.g., eu-central-003)
      credentials: {
        accessKeyId: Deno.env.get('B2_KEY_ID')!,
        secretAccessKey: Deno.env.get('B2_APPLICATION_KEY')!,
      },
      forcePathStyle: true, // required for Backblaze
    });

    const bucketName = Deno.env.get('B2_BUCKET_NAME') || 'ceka-resources-vault';

    // 4. Generate presigned URL for the specific object
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: file_path,
      ResponseContentDisposition: `attachment; filename="${file_path.split('/').pop()}"`,
    });
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: expirySeconds });

    console.log(`[${requestId}] Vault access granted:`, {
      user_id: user.id,
      email: user.email,
      file_path,
      expires_in: expirySeconds,
      duration_ms: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({ signedUrl, expires_in: expirySeconds, request_id: requestId }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-ID': requestId },
      }
    );
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const status = errorMsg.includes('Unauthorized') ? 401 : 400;
    console.error(`[${requestId}] Vault error:`, errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg, request_id: requestId }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
    );
  }
});