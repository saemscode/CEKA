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
      // 1. Submit Signature (Server-side logging)
      const { data, error } = await supabase.rpc('submit_signature', {
        bill_id_param: billId,
        template_id_param: templateId,
        name_param: identity.name,
        email_param: identity.email,
        constituency_param: identity.constituency,
        county_param: identity.county,
        comments_param: comments
      }) as { data: any, error: any };

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Already Signed",
            description: "You have already signed this memorandum.",
          });
          setIsSubmitting(false);
          return null;
        }
        throw error;
      }

      setSubmissionId(data.id);
      setIsSubmitting(false);
      
      // In a real production app, we'd trigger an OTP here.
      // For now, we'll mark as needing verification if we want to simulate the flow.
      setNeedsVerification(true);
      
      return data.id;
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
      }) as { data: any, error: any };

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
    // @ts-ignore
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
    submissionId
  };
};
