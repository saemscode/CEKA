import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface UserIdentity {
  name: string;
  email: string;
  constituency: string;
  county: string;
}

export const useTemplateSubmission = (billId: string, templateId: string | null) => {
  const [identity, setIdentity] = useState<UserIdentity>({
    name: '',
    email: '',
    constituency: '',
    county: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  const updateIdentity = (updates: Partial<UserIdentity>) => {
    setIdentity(prev => ({ ...prev, ...updates }));
  };

  const submitSignature = async (comments: string = '') => {
    if (!identity.name || !identity.email) {
      toast({
        title: "Missing Details",
        description: "Please provide your name and email.",
        variant: "destructive"
      });
      return null;
    }

    setIsSubmitting(true);
    try {
      // Switch from RPC directly to our Sovereignty Mesh Edge Function
      const { data, error } = await supabase.functions.invoke('submit-signature', {
        body: {
          bill_id: billId,
          template_id: templateId,
          name: identity.name,
          email: identity.email,
          county: identity.county,
          constituency: identity.constituency,
          comments: comments
        }
      });

      if (error) {
        // Handle custom 409 error from the Edge Function
        if (error.status === 409 || error.message?.includes('23505')) {
          toast({
            title: "Already Signed",
            description: "You have already signed this memorandum.",
          });
          setIsSubmitting(false);
          return null;
        }
        throw error;
      }

      if (data && data.success) {
        setSubmissionId(data.id);
        setNeedsVerification(false); // Instant Success Protocol: No verification needed
      }
      
      setIsSubmitting(false);
      return data?.id || null;
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Submission Error",
        description: "Failed to log signature. Please try again.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return null;
    }
  };

  const verifyOTP = async (otpCode: string) => {
    if (!submissionId) return false;

    try {
      const { data, error } = await supabase.rpc('verify_signature_otp', {
        signature_id_param: submissionId,
        otp_code_param: otpCode
      });

      if (error || !data.success) {
        toast({
          title: "Verification Failed",
          description: data?.error || "Invalid verification code.",
          variant: "destructive"
        });
        return false;
      }

      setNeedsVerification(false);
      toast({
        title: "Identity Verified",
        description: "Your signature has been confirmed.",
      });
      return true;
    } catch (error) {
      console.error('Verification error:', error);
      return false;
    }
  };

  const amplifyWhatsApp = (billTitle: string) => {
    const shareUrl = window.location.href;
    const text = `I just signed the objection to ${billTitle} on CEKA. Join thousands of other Kenyans in defending our sovereignty. Sign here: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    
    // Track share
    supabase.rpc('increment_whatsapp_share');
  };

  return {
    identity,
    updateIdentity,
    submitSignature,
    verifyOTP,
    amplifyWhatsApp,
    isSubmitting,
    needsVerification,
    setNeedsVerification,
    submissionId
  };
};
