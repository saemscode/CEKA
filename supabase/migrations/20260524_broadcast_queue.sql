-- Broadcast History & Queue System
-- Enables asynchronous delivery and full audit traceability

-- 1. Broadcast History (Master Record)
CREATE TABLE IF NOT EXISTS public.broadcast_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    subject TEXT NOT NULL,
    content_raw TEXT NOT NULL,
    target_list TEXT NOT NULL, -- 'profiles', 'community', 'both'
    audience_filter JSONB DEFAULT '{}'::jsonb,
    total_recipients INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' -- 'pending', 'processing', 'completed', 'failed'
);

-- 2. Broadcast Queue (Individual Tasks)
CREATE TABLE IF NOT EXISTS public.broadcast_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id UUID REFERENCES public.broadcast_history(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    personalization_data JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'queued', -- 'queued', 'sent', 'failed'
    error_message TEXT,
    provider_used TEXT, -- 'resend', 'brevo'
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.broadcast_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_queue ENABLE ROW LEVEL SECURITY;

-- Security: Only admins can manage broadcast history/queue
CREATE POLICY "Admins can manage broadcast history" ON public.broadcast_history
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'core_team')));

CREATE POLICY "Admins can manage broadcast queue" ON public.broadcast_queue
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'core_team')));

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_broadcast_queue_status ON public.broadcast_queue(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_queue_broadcast_id ON public.broadcast_queue(broadcast_id);

-- 3. Utility Function to safely get mailing stats
-- Already exists from previous migration, but ensuring stability
CREATE OR REPLACE FUNCTION public.get_mailing_mesh_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    resend_count INTEGER;
    brevo_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO resend_count 
    FROM public.admin_audit_log 
    WHERE action IN ('broadcast_sent_resend', 'resend_delivery') 
    AND created_at >= CURRENT_DATE;

    SELECT COUNT(*) INTO brevo_count 
    FROM public.admin_audit_log 
    WHERE action IN ('broadcast_sent_brevo', 'brevo_delivery') 
    AND created_at >= CURRENT_DATE;

    RETURN jsonb_build_object(
        'resend_today', resend_count,
        'resend_limit', 100,
        'brevo_today', brevo_count,
        'brevo_limit', 300
    );
END;
$$;

-- 4. Trigger to call Edge Function for each queue item
-- Replace [SUPABASE_URL] and [SUPABASE_SERVICE_ROLE_KEY] with real values or use environment bridging
CREATE OR REPLACE FUNCTION public.trigger_process_broadcast_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM
        net.http_post(
            url := 'https://cajrvemigxghnfmyopiy.supabase.co/functions/v1/process-broadcast-queue',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('vault.service_role_key', true)
            ),
            body := jsonb_build_object('record', row_to_json(NEW))
        );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_broadcast_queue_insert
    AFTER INSERT ON public.broadcast_queue
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_process_broadcast_queue();
