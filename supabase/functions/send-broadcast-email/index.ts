// @ts-nocheck

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
        const { target, subject, content, userId } = await req.json();

        // 1. Fetch Recipients based on Target
        let recipients: any[] = [];

        if (target === 'profiles' || target === 'both') {
            const { data: profiles, error: pError } = await supabase
                .from('profiles')
                .select('email, full_name, county, interests');

            if (pError) console.error('Profiles fetch error:', pError);
            if (profiles) {
                recipients.push(...profiles.map(p => ({
                    email: p.email,
                    first_name: p.full_name?.split(' ')[0] || '',
                    last_name: p.full_name?.split(' ').slice(1).join(' ') || '',
                    display_name: p.full_name || '',
                    county: p.county || '',
                    interests: p.interests || ''
                })));
            }
        }

        if (target === 'community' || target === 'both') {
            const { data: members, error: mError } = await supabase
                .from('community_members')
                .select('email, first_name, last_name, county, interests');

            if (mError) console.error('Community members fetch error:', mError);
            if (members) {
                recipients.push(...members.map(m => ({
                    email: m.email,
                    first_name: m.first_name,
                    last_name: m.last_name,
                    display_name: `${m.first_name} ${m.last_name}`.trim(),
                    county: m.county || '',
                    interests: m.interests || ''
                })));
            }
        }

        // Deduplicate by email
        const uniqueRecipients = Array.from(new Map(recipients.filter(r => !!r.email).map(r => [r.email, r])).values());

        if (uniqueRecipients.length === 0) throw new Error('No recipients found for this target list.');

        // 2. Create Broadcast Master Record
        const { data: bcHistory, error: bcError } = await supabase
            .from('broadcast_history')
            .insert({
                created_by: userId,
                subject,
                content_raw: content,
                target_list: target,
                total_recipients: uniqueRecipients.length,
                status: 'processing'
            })
            .select()
            .single();

        if (bcError) throw bcError;

        // 3. Populate Queue in Batches
        const batchSize = 100;
        for (let i = 0; i < uniqueRecipients.length; i += batchSize) {
            const batch = uniqueRecipients.slice(i, i + batchSize).map(r => ({
                broadcast_id: bcHistory.id,
                recipient_email: r.email,
                recipient_name: r.first_name || r.display_name || 'Citizen',
                personalization_data: {
                    first_name: r.first_name || '',
                    last_name: r.last_name || '',
                    display_name: r.display_name || '',
                    county: r.county || '',
                    interests: r.interests || ''
                }
            }));

            const { error: qError } = await supabase.from('broadcast_queue').insert(batch);
            if (qError) console.error('Queue insertion error:', qError);
        }

        // 4. Update Audit Log
        await supabase.from('admin_audit_log').insert({
            action: 'broadcast_initiated',
            details: { target, total_recipients: uniqueRecipients.length, broadcast_id: bcHistory.id }
        });

        return new Response(JSON.stringify({
            success: true,
            message: `Broadcasting initiated for ${uniqueRecipients.length} recipients.`,
            broadcast_id: bcHistory.id
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

