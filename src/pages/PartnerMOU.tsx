import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/layout/Layout';
import { CEKALoader } from '@/components/ui/ceka-loader';

const MOU_VERSION = '2.0-2026';

// Full MOU sections extracted from CEKA_MOU_Template_v2.md
// Dynamic partner name placeholder replaced at render time
const MOU_SECTIONS = [
  {
    id: 'preamble',
    title: '1. Preamble',
    body: `This Memorandum of Understanding ("MoU") is entered into between CIVIC EDUCATION KENYA (CEKA), a civic education initiative operating as an open civic infrastructure network in Kenya, with principal contact at civiceducationkenya@gmail.com (hereinafter referred to as "CEKA"), and the Partner Organization (hereinafter referred to as "the Partner"), collectively referred to as "the Parties". CEKA has developed digital civic infrastructure including the Nasaka IEBC platform. Both Parties recognize significant alignment in their missions, methodologies, and target constituencies. NOW THEREFORE, the Parties agree to collaborate under the terms set forth in this Memorandum of Understanding.`,
  },
  {
    id: 'definitions',
    title: '2. Definitions',
    body: `"Nasaka IEBC" means the CEKA-owned digital platform designed to help Kenyan citizens locate IEBC voter registration centers. "Confidential Information" means any and all non-public information disclosed by one Party to the other. "Personal Data" means any information relating to an identified or identifiable natural person, as defined under the Kenya Data Protection Act, 2019. "Co-branded Materials" means any communications or digital content that display both Parties' names, logos, or organizational identities. "Effective Date" means the date on which this MoU is digitally accepted by the Partner. "Working Day" means any day other than a Saturday, Sunday, or public holiday observed in Kenya.`,
  },
  {
    id: 'purpose',
    title: '3. Purpose & Objectives',
    body: `This MoU establishes a structured framework for collaboration between CEKA and the Partner to enhance civic participation, strengthen voter registration processes, and expand civic education reach across Kenya. Core Objectives include: (1) Amplify Civic Infrastructure Access — increase nationwide awareness of CEKA's Nasaka IEBC platform; (2) Combat Electoral Misinformation — coordinate efforts to disseminate accurate, verified electoral information; (3) Enhance Community-Level Engagement — integrate CEKA's digital tools with the Partner's ground activations; (4) Build Sustainable Civic Networks — establish replicable collaboration models; (5) Strengthen Youth Civic Participation — specifically target youth aged 18–35 through tailored messaging.`,
  },
  {
    id: 'scope',
    title: '4. Scope of Collaboration',
    body: `The Parties agree to: co-brand approved civic education materials subject to mutual written approval; cross-promote platforms and initiatives through respective digital channels; coordinate content calendars for major civic education campaigns with advance notice of at least 14 days for major campaigns and 7 days for routine content; share digital asset repositories through a mutually accessible digital workspace; implement UTM tracking codes for all cross-promotional digital content. The Partner agrees to amplify Nasaka IEBC across all digital platforms, integrate CEKA tools into core programmes, and facilitate community access to Nasaka IEBC through live demonstrations.`,
  },
  {
    id: 'governance',
    title: '5. Governance & Coordination',
    body: `The Parties hereby establish a Steering Group as the primary coordination and decision-making body. Composition: one designated focal person from each Party with decision-making authority. Meetings: the Steering Group shall convene monthly. Decisions require consensus of both focal persons. CEKA Focal Point: SG — Founder | civiceducationkenya@gmail.com. Primary Channel: Email for all formal communications. Response Commitments: urgent matters within 4 working hours; standard operational matters within 2 working days; approval requests within 48 working hours.`,
  },
  {
    id: 'data',
    title: '7. Data Protection, Privacy & Handling',
    body: `Both Parties commit to full compliance with the Kenya Data Protection Act, 2019 and all regulations thereunder. The Parties expressly agree that no Personal Data shall be purposefully collected, processed, or exchanged under this MoU. CEKA's Nasaka IEBC is intentionally architected with zero-personal-data-capture functionality: no user accounts or registrations required, no collection of names, phone numbers, or email addresses, no tracking of individual user behavior beyond aggregated anonymized analytics. In the event of a data security breach, the affected Party must notify the other Party within 24 hours of discovery. Upon termination, each Party shall securely delete or return Confidential Information within 14 days.`,
  },
  {
    id: 'ip',
    title: '8. Intellectual Property & Licensing',
    body: `Each Party retains full and exclusive ownership of all intellectual property rights existing prior to the Effective Date. CEKA hereby grants the Partner a limited, non-exclusive, non-transferable, royalty-free license to reproduce and distribute CEKA-provided campaign materials solely for activities described in this MoU. Materials must be used in accordance with branding guidelines. No modifications to CEKA branding elements without express written permission. Attribution to CEKA must be maintained on all reproduced materials. Materials must not be used for commercial purposes, political campaigns, or partisan activities.`,
  },
  {
    id: 'branding',
    title: '9. Branding & Public Communications',
    body: `Both logos must appear on all co-branded materials. Logo sizes must be within 20% of each other unless tactically agreed. Submit co-branded materials for mutual approval via email at least 48 working hours before intended publication. Neither Party may imply governmental affiliation or endorsement on behalf of the other Party, suggest exclusive partnerships that conflict with either organization's other relationships, make political endorsements using the other Party's branding, or exaggerate user numbers or impact metrics beyond documented evidence.`,
  },
  {
    id: 'confidentiality',
    title: '10. Confidentiality',
    body: `Each Party receiving Confidential Information agrees to maintain confidentiality and not disclose it to third parties without prior written consent, use Confidential Information solely for purposes outlined in this MoU, and restrict access to personnel with legitimate need-to-know. Confidentiality obligations shall survive termination of this MoU for a period of two (2) years.`,
  },
  {
    id: 'financial',
    title: '11. Financial Arrangements',
    body: `This MoU does not create direct financial payment obligations between the Parties. Each organization shall bear its own operational costs. For discrete joint activities requiring shared costs, the default cost-sharing formula is 50/50 unless otherwise agreed. Neither Party shall be penalized for reasonable delays resulting from documented resource constraints, provided timely communication and good-faith mitigation efforts are demonstrated.`,
  },
  {
    id: 'liability',
    title: '13. Liability, Indemnity & Insurance',
    body: `To the fullest extent permitted by applicable law, neither Party shall be liable to the other for indirect, incidental, or consequential damages arising from or related to this MoU. Each Party agrees to indemnify and hold harmless the other Party from and against any third-party claims arising from negligence or willful misconduct, material breach of any term or condition, intellectual property infringement, or data protection violations.`,
  },
  {
    id: 'termination',
    title: '15. Term, Termination & Exit',
    body: `Either Party may terminate this MoU without cause by providing thirty (30) days' written notice to the other Party via email to the designated focal point. Either Party may terminate immediately if the other Party commits a material breach and fails to cure it within fourteen (14) calendar days of receiving written notice. Upon termination, both Parties shall cease use of the other Party's intellectual property within sixty (60) days and prepare a close-out report within thirty (30) days.`,
  },
  {
    id: 'dispute',
    title: '16. Dispute Resolution',
    body: `In the event of any dispute, the Parties shall first attempt resolution through good faith negotiation. If negotiation fails within twenty (20) working days, either Party may invoke mediation. If mediation fails within forty-five (45) calendar days, either Party may submit to binding arbitration under the Nairobi Centre for International Arbitration (NCIA) rules. Seat of arbitration: Nairobi, Kenya. The arbitrator's decision shall be final and binding.`,
  },
  {
    id: 'general',
    title: '17. General Provisions',
    body: `This MoU shall be governed by, construed, and enforced in accordance with the laws of the Republic of Kenya. This MoU does not create an employment relationship, agency, partnership, joint venture, or legal entity with separate legal status. Each Party remains independently operated. Electronic acceptance of this MoU (including digital acknowledgment via the CEKA platform) shall have the same legal effect as original ink signatures, in accordance with Kenya's electronic transactions legislation. Both Parties commit to full compliance with applicable Kenyan laws, upholding highest ethical standards, non-discrimination, and safeguarding policies protecting vulnerable populations.`,
  },
];

const PartnerMOU = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signedAt] = useState(() => new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'full', timeStyle: 'long' }));

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadPartner();
  }, [user]);

  const loadPartner = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from('partners' as any) as any)
        .select('id, org_name, org_email, verification_status, agreement_signed, mou_version')
        .eq('submitted_by_user_id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // No partner record — not a partner applicant
        navigate('/');
        return;
      }

      // Already fully signed — go to dashboard
      if (data.agreement_signed && data.mou_version === MOU_VERSION) {
        navigate('/partner/dashboard');
        return;
      }

      // Not yet approved — nothing to sign yet
      if (!['credible', 'premium'].includes(data.verification_status)) {
        // Show pending state instead of redirecting away
        setPartner({ ...data, pending: true });
        setLoading(false);
        return;
      }

      setPartner(data);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 80;
    if (atBottom) setScrolledToBottom(true);
  };

  const handleSign = async () => {
    if (!partner || !user || !agreed) return;
    setSigning(true);
    try {
      const now = new Date().toISOString();

      // Write agreement data to partners record (own row — RLS allows this)
      const { error: updateErr } = await (supabase.from('partners' as any) as any)
        .update({
          agreement_signed: true,
          mou_signed_at: now,
          mou_version: MOU_VERSION,
          updated_at: now,
        })
        .eq('id', partner.id);

      if (updateErr) throw updateErr;

      // Audit log via edge function call (service role)
      await supabase.functions.invoke('ingest-partner-application', {
        body: {
          _audit_only: true,
          auth_user_id: user.id,
          action: 'mou_digitally_signed',
          partner_id: partner.id,
          mou_version: MOU_VERSION,
          signed_at: now,
        },
      }).catch(() => {}); // non-fatal

      toast({
        title: '✅ MOU Signed!',
        description: 'Your CEKA Partnership Agreement is now in effect. Welcome to the CEKA Partner network.',
      });

      navigate('/partner/dashboard');
    } catch (err: any) {
      toast({ title: 'Signing failed', description: err.message, variant: 'destructive' });
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <CEKALoader variant="scanning" size="lg" text="Loading Partnership Agreement..." />
        </div>
      </Layout>
    );
  }

  // Pending — approved not yet granted
  if (partner?.pending) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg w-full text-center space-y-6 p-10 rounded-[32px] bg-card/60 backdrop-blur-2xl border border-border/40 shadow-ios-high"
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center text-4xl">⏳</div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-foreground mb-2">Application Under Review</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your application for <strong>{partner.org_name}</strong> has been successfully received and is currently being reviewed by the CEKA team.
                The MOU signing link will become available once your application is approved.
              </p>
            </div>
            <div className="rounded-2xl bg-muted/40 border border-border/30 p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground font-medium">Organization</span><span className="font-bold">{partner.org_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground font-medium">Status</span><span className="font-bold text-amber-500">Pending Review</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground font-medium">Contact</span><span className="font-bold text-xs">admin@civiceducationkenya.com</span></div>
            </div>
            <p className="text-xs text-muted-foreground">Expect a response within 2–5 business days. You will receive an email when approved.</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-[#0b2447]/5 to-transparent py-10 px-4">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0b2447]/10 border border-[#0b2447]/20 text-[#0b2447] dark:text-white/70 text-[11px] font-black uppercase tracking-widest">
              <span>📋</span> CEKA Partnership Agreement
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-foreground">Memorandum of Understanding</h1>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Please read the full agreement carefully. Scroll to the bottom to enable the signature section.
              Your digital acceptance is legally binding under Kenyan electronic transactions legislation.
            </p>
          </motion.div>

          {/* MOU Metadata card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-[#0b2447]/20 bg-[#0b2447]/5 p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center"
          >
            {[
              { label: 'Between', value: 'CEKA & ' + partner?.org_name },
              { label: 'Version', value: MOU_VERSION },
              { label: 'Governing Law', value: 'Republic of Kenya' },
              { label: 'Effective Upon', value: 'Digital Acceptance' },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                <p className="text-xs font-bold text-foreground leading-snug">{value}</p>
              </div>
            ))}
          </motion.div>

          {/* Scrollable MOU Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-[28px] border border-border/50 bg-card/70 backdrop-blur-2xl shadow-ios-high overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between">
              <span className="text-sm font-black text-foreground">CEKA MOU Template — Version 2.0</span>
              {!scrolledToBottom && (
                <span className="text-[10px] font-bold text-amber-500 animate-pulse">↓ Scroll to read full agreement</span>
              )}
              {scrolledToBottom && (
                <span className="text-[10px] font-bold text-green-500">✓ Document read</span>
              )}
            </div>

            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="h-[480px] overflow-y-auto px-8 py-6 space-y-6 text-sm text-muted-foreground leading-relaxed scroll-smooth"
              style={{ scrollbarWidth: 'thin' }}
            >
              {/* Title block */}
              <div className="text-center pb-4 border-b border-border/30 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#0b2447] dark:text-white/60">Civic Education Kenya</p>
                <h2 className="text-xl font-black text-foreground tracking-tight">MEMORANDUM OF UNDERSTANDING</h2>
                <p className="text-xs">Between <strong>Civic Education Kenya (CEKA)</strong> and <strong>{partner?.org_name}</strong></p>
                <p className="text-[10px] text-muted-foreground">Reference No.: CEKA-PARTNER-MOU-{new Date().getFullYear()} · Governing Law: Republic of Kenya</p>
              </div>

              {MOU_SECTIONS.map((section) => (
                <div key={section.id} className="space-y-2">
                  <h3 className="text-sm font-black text-foreground tracking-tight border-l-2 border-[#0b2447] pl-3">{section.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-3">{section.body}</p>
                </div>
              ))}

              {/* Signature block at bottom of document */}
              <div className="pt-8 border-t border-border/40 space-y-4">
                <h3 className="text-sm font-black text-foreground">19. Signatures</h3>
                <p className="text-sm text-muted-foreground">By digitally accepting below, the authorized representative of the Partner Organization confirms their understanding of, agreement to, and commitment to fulfill the terms set forth in this Memorandum of Understanding.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-muted/30 border border-border/30 p-4 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">For CEKA</p>
                    <p className="text-sm font-bold text-foreground">SG — Founder</p>
                    <p className="text-xs text-muted-foreground">civiceducationkenya@gmail.com</p>
                    <p className="text-xs font-semibold text-green-500">✓ Pre-signed by CEKA</p>
                  </div>
                  <div className="rounded-xl bg-muted/30 border border-border/30 p-4 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">For {partner?.org_name}</p>
                    <p className="text-sm font-bold text-foreground">{partner?.org_name}</p>
                    <p className="text-xs text-muted-foreground">{partner?.org_email}</p>
                    <p className="text-xs font-semibold text-amber-500">⏳ Awaiting your acceptance</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Signature Section */}
          <AnimatePresence>
            {scrolledToBottom && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                className="rounded-[28px] border-2 border-[#006633]/30 bg-gradient-to-br from-[#006633]/5 to-[#0b2447]/5 backdrop-blur-2xl shadow-ios-high p-8 space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#006633]/10 flex items-center justify-center text-xl">✍️</div>
                  <div>
                    <h2 className="text-lg font-black text-foreground tracking-tight">Digital Signature</h2>
                    <p className="text-xs text-muted-foreground">Your acceptance is timestamped and audit-logged.</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground font-medium">Signatory</span><span className="font-bold">{partner?.org_name}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground font-medium">Email</span><span className="font-bold">{partner?.org_email}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground font-medium">Timestamp (EAT)</span><span className="font-bold">{signedAt}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground font-medium">MOU Version</span><span className="font-bold">{MOU_VERSION}</span></div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="sr-only peer"
                      id="mou-agree"
                    />
                    <div className="w-5 h-5 rounded-md border-2 border-white/20 bg-white/5 peer-checked:bg-[#006633] peer-checked:border-[#006633] transition-all flex items-center justify-center">
                      {agreed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                    I, as an authorized representative of <strong className="text-foreground">{partner?.org_name}</strong>, confirm that I have read, understood, and agree to be bound by all terms and conditions of this CEKA Partnership Memorandum of Understanding (Version {MOU_VERSION}). I acknowledge this constitutes a legally binding digital signature under Kenyan electronic transactions legislation.
                  </span>
                </label>

                <button
                  onClick={handleSign}
                  disabled={!agreed || signing}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#006633] to-[#004d26] hover:opacity-90 disabled:opacity-40 text-white font-black text-[12px] uppercase tracking-widest transition-all active:scale-[0.98] shadow-xl shadow-[#006633]/20 flex items-center justify-center gap-2"
                >
                  {signing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      I Accept & Digitally Sign This Agreement
                    </>
                  )}
                </button>

                <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
                  By clicking above, your acceptance is securely stored with a timestamp in the CEKA audit log.
                  This record cannot be modified. Governed by the Republic of Kenya.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
};

export default PartnerMOU;
