-- =============================================
-- PHASE 2: IDENTITY VERIFICATION & ANALYTICS
-- =============================================

-- 1. ADD VERIFICATION FIELDS TO SIGNATURES
ALTER TABLE public.signatures 
ADD COLUMN IF NOT EXISTS otp_code TEXT,
ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP WITH TIME ZONE;

-- 2. CAMPAIGN UPDATE TABLE
-- For creator updates ("Update: The Finance Committee has acknowledged receipt")
CREATE TABLE IF NOT EXISTS public.campaign_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.campaign_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view campaign updates" ON public.campaign_updates FOR SELECT USING (true);

-- 3. SIGNATURE VERIFICATION RPC
CREATE OR REPLACE FUNCTION public.verify_signature_otp(
  signature_id_param UUID,
  otp_code_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if signature exists and OTP matches and not expired
  UPDATE public.signatures
  SET is_verified = TRUE,
      otp_code = NULL,
      otp_expiry = NULL
  WHERE id = signature_id_param 
    AND otp_code = otp_code_param
    AND otp_expiry > now()
    AND is_verified = FALSE;

  IF FOUND THEN
    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired verification code');
  END IF;
END;
$$;

-- 4. ANALYTICS VIEWS
CREATE OR REPLACE VIEW public.signature_stats AS
SELECT 
  bill_id,
  COUNT(*) as total_signatures,
  COUNT(*) FILTER (WHERE is_verified = TRUE) as verified_signatures,
  COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') as last_24h_signatures
FROM public.signatures
GROUP BY bill_id;
