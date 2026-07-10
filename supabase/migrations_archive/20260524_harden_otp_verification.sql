-- ============================================================
-- CEKA Verification Hardening
-- Migration: 20260524_harden_otp_verification.sql
-- ============================================================

-- Update verify_signature_otp to perform real validation against the signatures table
CREATE OR REPLACE FUNCTION public.verify_signature_otp(
  signature_id_param UUID,
  otp_code_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    found_id UUID;
BEGIN
    -- 1. Check for valid match that is not yet verified
    SELECT id INTO found_id
    FROM public.signatures
    WHERE id = signature_id_param
      AND otp_code = otp_code_param
      AND is_verified = false;

    IF found_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Invalid verification code or signature already verified.'
        );
    END IF;

    -- 2. Update to verified status
    UPDATE public.signatures
    SET is_verified = true
    WHERE id = found_id;

    -- 3. Return success
    RETURN jsonb_build_object('success', true);
END;
$$;

-- Ensure permissions are intact
GRANT EXECUTE ON FUNCTION public.verify_signature_otp(UUID, TEXT) TO anon, authenticated;
