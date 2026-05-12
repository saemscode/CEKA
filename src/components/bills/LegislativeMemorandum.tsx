import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  BankIcon, ShareIcon, CommentsIcon, GlobeIcon, SearchIcon, 
  UsersIcon, ChartIcon, ThumbIcon, KenyaIcon, KeyIcon, 
  LocationIcon, CommandIcon, WidgetIcon, ScanIcon, PathIcon, 
  BuildingsIcon, StarIcon, CloseIcon, ArrowLeftIcon 
} from "../ui/CustomIcons";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TemplateCreator } from "./TemplateCreator";
import { TemplatesGallery } from "./TemplatesGallery";
import { MP_CONTACTS, getMPByConstituency } from "@/lib/parliamentaryContacts";
import { useTemplateSubmission } from "@/hooks/useTemplateSubmission";
import { SignatureCounter } from "./SignatureCounter";
import { CountdownTimer } from "./CountdownTimer";
import { MPLookup } from "./MPLookup";
import { SubmissionVerification } from "./SubmissionVerification";

interface LegislativeMemorandumProps {
  billId: string;
  billTitle: string;
  billSummary: string;
  deadline?: string | null;
  signatureGoal?: number;
}

export const LegislativeMemorandum: React.FC<LegislativeMemorandumProps> = ({
  billId,
  billTitle,
  billSummary,
  deadline,
  signatureGoal = 1000
}) => {
  const {
    identity,
    updateIdentity,
    submitSignature,
    verifyOTP,
    amplifyWhatsApp,
    isSubmitting,
    needsVerification,
    submissionId
  } = useTemplateSubmission(billId, null);

  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState({
    clerk: true,
    financeCommittee: true,
    localMP: true
  });
  const [customEmails, setCustomEmails] = useState<{id: number, address: string}[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [signatureCount, setSignatureCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const { count } = await supabase.from('signatures' as any).select('*', { count: 'exact', head: true }).eq('bill_id', billId);
      setSignatureCount(count || 0);
    };
    fetchStats();
  }, [billId]);

  useEffect(() => {
    setSubject(`RE: MEMORANDUM OF OBJECTION TO ${billTitle.toUpperCase()}`);
    
    const template = `Dear Clerk of the National Assembly and Members of the Finance Committee,

The above subject refers;

Pursuant to Articles 10(2), 118(1) of the Constitution 2010 that mandates Public Participation in any Legislative Process I, {{full_name}}, a resident of {{constituency}} Constituency, {{county}} County, wish to submit my Memoranda as follows:

Regarding: ${billTitle}
Context: ${billSummary}

In conclusion, I call for the withdrawal of this Bill as it is made in Bad Faith, ignorant to the Current Economic Needs and Political Wills of the People of Kenya. I thus pray that you Reject it for the sake of a better Kenya.

Yours Faithfully,

{{full_name}}
Date: {{date}}

Citizen of Kenya`;
    
    setMessageBody(template);
  }, [billTitle, billSummary]);

  const getProcessedBody = () => {
    let processed = messageBody;
    const tokens: Record<string, string> = {
      '{{full_name}}': identity.name || '[FIRST NAME]',
      '{{constituency}}': identity.constituency || '[CONSTITUENCY]',
      '{{county}}': identity.county || '[COUNTY]',
      '{{date}}': new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      '{{bill_title}}': billTitle
    };

    Object.entries(tokens).forEach(([token, value]) => {
      processed = processed.split(token).join(value);
    });

    return processed;
  };

  const recipients = {
    clerk: { name: "Clerk of the National Assembly", email: "cna@parliament.go.ke" },
    financeCommittee: { name: "Finance Committee", email: "financecommitteena@parliament.go.ke" }
  };

  const handleRecipientChange = (recipient: 'clerk' | 'financeCommittee' | 'localMP', checked: boolean) => {
    setSelectedRecipients(prev => ({ ...prev, [recipient]: checked }));
  };

  const getRecipientEmails = () => {
    const emails: string[] = [];
    if (selectedRecipients.clerk) emails.push(recipients.clerk.email);
    if (selectedRecipients.financeCommittee) emails.push(recipients.financeCommittee.email);
    if (selectedRecipients.localMP && identity.constituency) {
      const mp = getMPByConstituency(identity.constituency);
      if (mp) emails.push(mp.email);
    }
    customEmails.forEach(e => emails.push(e.address));
    return emails;
  };

  const isDesktop = () => !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const handleSelectTemplate = (template: any) => {
    setSubject(template.metadata?.subject || `RE: MEMORANDUM OF OBJECTION TO ${template.title.toUpperCase()}`);
    setMessageBody(template.body);
    setIsGalleryOpen(false);
    toast({
      title: "Template Ready",
      description: "Using shared memorandum template.",
    });
  };

  const handleInitialSubmit = async () => {
    if (!hasConsent) {
      toast({
        title: "Consent Required",
        description: "Please confirm that you authorize CEKA to submit this on your behalf.",
        variant: "destructive"
      });
      return;
    }

    const res = await submitSignature(`Submitted via official email.`);
    if (res) {
       toast({
         title: "Almost Done",
         description: "Sending verification code...",
       });
    }
  };

  const handleFinalDispatch = async () => {
    const selectedEmails = getRecipientEmails();
    if (selectedEmails.length === 0) return;

    const to = selectedEmails.join(',');
    const encodedSubject = encodeURIComponent(subject);
    const personalizedMessage = getProcessedBody();
    const encodedBody = encodeURIComponent(personalizedMessage);
    
    if (isDesktop()) {
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodedSubject}&body=${encodedBody}`;
      window.open(gmailUrl, '_blank');
    } else {
      window.location.href = `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
    }
  };

  const handleAmplify = () => {
    amplifyWhatsApp(billTitle);
  };

  const handleSavePDF = () => {
    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <div style="padding: 60px; font-family: 'Times New Roman', serif; line-height: 1.8; color: black; max-width: 800px; margin: auto;">
        <div style="text-align: center; border-bottom: 3px double #006400; padding-bottom: 20px; margin-bottom: 40px;">
          <h1 style="margin: 0; color: #006400; text-transform: uppercase; font-size: 28px; letter-spacing: 2px;">Memorandum of Objection</h1>
          <p style="margin: 10px 0; font-size: 12px; color: #555; font-weight: bold; font-family: sans-serif; letter-spacing: 1px;">CIVIC ACTION NETWORK • KENYA</p>
        </div>
        <div style="margin-bottom: 40px; font-size: 14px;">
          <p><strong>RECIPIENTS:</strong> ${getRecipientEmails().join(', ')}</p>
          <p><strong>DATE:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>SUBJECT:</strong> ${subject}</p>
        </div>
        <div style="white-space: pre-wrap; font-size: 16px; text-align: justify;">
          ${getProcessedBody()}
        </div>
        <div style="margin-top: 80px; padding-top: 30px; border-top: 1px solid #ccc; text-align: center;">
          <p style="margin: 0; font-weight: bold;">Digital Signature</p>
          <p style="margin: 5px 0; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">${identity.name}</p>
          <p style="font-size: 10px; color: #888; text-transform: uppercase;">Reference ID: ${submissionId || 'CEKA-ID-' + billId.slice(0,8)}</p>
        </div>
      </div>
    `;
    
    const originalBody = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalBody;
    window.location.reload(); 
  };

  const addRecipient = () => {
    if (!newEmail.includes('@')) return;
    setCustomEmails([...customEmails, { id: Date.now(), address: newEmail }]);
    setNewEmail('');
    setIsAddingEmail(false);
  };

  return (
    <div className="relative group/memorandum">
      {/* Outer Shell */}
      <div className="relative p-[1px] rounded-[40px] bg-gradient-to-br from-white/20 to-white/5 dark:from-white/10 dark:to-transparent shadow-ios-high overflow-hidden">
        <div className="bg-white/90 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[39px] overflow-hidden">
          
          {/* Status Header */}
          <div className="px-8 py-5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3">
               <div className="h-4 w-4 rounded-full bg-kenya-green shadow-[0_0_10px_rgba(0,186,0,0.5)] animate-pulse" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Process Active</p>
            </div>
            <div className="flex items-center gap-4">
               <SignatureCounter current={signatureCount} goal={signatureGoal} variant="compact" className="w-[100px]" />
               <div className="h-4 w-[1px] bg-black/5 dark:bg-white/5" />
               <div className="flex items-center gap-2">
                 <button onClick={() => setIsGalleryOpen(true)} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-slate-400 hover:text-kenya-green">
                   <UsersIcon size={16} />
                 </button>
                 <button onClick={() => setIsCreatorOpen(true)} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-slate-400 hover:text-kenya-green">
                   <CommandIcon size={16} />
                 </button>
               </div>
            </div>
          </div>

          <div className="p-8 space-y-10">
            {/* Deadline Timer */}
            <CountdownTimer deadline={deadline} />

            {/* Details Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <ScanIcon size={16} className="text-kenya-green" />
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Your Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "First Name", icon: <UsersIcon size={14} />, value: identity.name, key: 'name', placeholder: "Enter Name" },
                  { label: "Email Address", icon: <CommentsIcon size={14} />, value: identity.email, key: 'email', placeholder: "your@email.com" },
                  { label: "County", icon: <LocationIcon size={14} />, value: identity.county, key: 'county', placeholder: "e.g. Nairobi" },
                  { label: "Constituency", icon: <CommandIcon size={14} />, value: identity.constituency, key: 'constituency', placeholder: "e.g. Lang'ata" }
                ].map((field) => (
                  <div key={field.key} className="group/input relative">
                    <Input
                      value={field.value}
                      onChange={(e) => updateIdentity({ [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="h-14 pl-12 rounded-2xl border-none bg-slate-50 dark:bg-white/5 focus:bg-white dark:focus:bg-white/10 transition-all font-bold text-sm shadow-inner"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-kenya-green transition-colors">
                      {field.icon}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recipients Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <KeyIcon size={16} className="text-kenya-green" />
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Recipients</h3>
                </div>
                <button onClick={() => setIsAddingEmail(true)} className="text-[10px] font-black text-kenya-green uppercase tracking-widest flex items-center gap-1 hover:underline">
                   <CommandIcon size={10} /> Add Recipient
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                 {[
                  { id: 'clerk', label: 'National Assembly Clerk', email: recipients.clerk.email },
                  { id: 'financeCommittee', label: 'Finance Committee', email: recipients.financeCommittee.email }
                ].map((target) => (
                  <div 
                    key={target.id}
                    onClick={() => handleRecipientChange(target.id as any, !selectedRecipients[target.id as keyof typeof selectedRecipients])}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl transition-all duration-500 cursor-pointer border",
                      selectedRecipients[target.id as keyof typeof selectedRecipients]
                        ? "bg-kenya-green/10 border-kenya-green/20"
                        : "bg-slate-50 dark:bg-white/5 border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <div className="flex items-center gap-4">
                       <div className={cn(
                         "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                         selectedRecipients[target.id as keyof typeof selectedRecipients] ? "bg-kenya-green text-white shadow-lg" : "bg-slate-200 dark:bg-white/10 text-slate-400"
                       )}>
                         <CommentsIcon size={18} />
                       </div>
                       <div>
                         <p className="text-xs font-black tracking-tight">{target.label}</p>
                         <p className="text-[10px] font-medium text-slate-400">{target.email}</p>
                       </div>
                    </div>
                    <Checkbox checked={selectedRecipients[target.id as keyof typeof selectedRecipients]} className="rounded-full border-slate-300 dark:border-white/20" />
                  </div>
                ))}

                <MPLookup 
                  constituency={identity.constituency}
                  isSelected={selectedRecipients.localMP}
                  onSelect={(checked) => handleRecipientChange('localMP', checked)}
                />

                {customEmails.map(e => (
                   <div key={e.id} className="flex items-center justify-between p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                      <div className="flex items-center gap-4">
                         <div className="h-10 w-10 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                            <CommentsIcon size={18} />
                         </div>
                         <p className="text-xs font-black">{e.address}</p>
                      </div>
                      <button onClick={() => setCustomEmails(customEmails.filter(x => x.id !== e.id))}>
                         <CloseIcon size={14} className="text-slate-400" />
                      </button>
                   </div>
                ))}

                {isAddingEmail && (
                  <div className="flex gap-2 p-2 bg-slate-50 dark:bg-white/5 rounded-2xl">
                    <Input 
                      autoFocus
                      placeholder="email@parliament.ke" 
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addRecipient()}
                      className="border-none bg-transparent font-bold"
                    />
                    <Button onClick={addRecipient} className="bg-kenya-green rounded-xl h-10 px-4 font-black text-[10px] uppercase">Add</Button>
                  </div>
                )}
              </div>
            </div>

            {/* Memorandum Composition Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <CommentsIcon size={16} className="text-kenya-green" />
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Memorandum Content</h3>
                </div>
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-kenya-green/10 text-kenya-green text-[9px] font-black uppercase tracking-widest">
                  <StarIcon size={10} /> Auto-Fill Active
                </div>
              </div>

              <div className="space-y-4">
                 <div className="relative group">
                   <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="h-12 border-none bg-slate-50 dark:bg-white/5 rounded-xl font-bold text-xs pl-4 group-focus-within:bg-white dark:group-focus-within:bg-white/10 shadow-inner"
                   />
                   <SearchIcon size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                 </div>

                 <div className="relative">
                    <Textarea
                      readOnly
                      value={getProcessedBody()}
                      className="min-h-[260px] rounded-[32px] border-none bg-slate-50 dark:bg-white/5 text-base leading-relaxed p-8 green-scrollbar font-serif text-slate-600 dark:text-slate-300 shadow-inner"
                    />
                    <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
                       <BankIcon size={80} />
                    </div>
                 </div>

                 <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border-black/5 dark:border-white/5">
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Edit Template</p>
                    <Textarea
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      className="min-h-[120px] bg-transparent border-none text-xl leading-relaxed p-0 green-scrollbar opacity-60 focus:opacity-100 transition-opacity"
                    />
                 </div>
              </div>
            </div>

            {/* Consent & Submission */}
            <div className="space-y-8">
               <div className="p-6 rounded-[32px] bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center gap-6 group/consent cursor-pointer" onClick={() => setHasConsent(!hasConsent)}>
                  <Checkbox 
                     checked={hasConsent}
                     onCheckedChange={(checked) => setHasConsent(checked as boolean)}
                     className="h-8 w-8 rounded-xl border-slate-300 dark:border-white/20 data-[state=checked]:bg-kenya-green data-[state=checked]:border-kenya-green transition-all"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-snug">
                      I authorize CEKA to submit this response on my behalf. I confirm that the details provided are accurate.
                    </p>
                  </div>
               </div>                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={handleInitialSubmit}
                    disabled={isSubmitting}
                    className="flex-[2] h-16 rounded-2xl bg-gradient-to-br from-kenya-green to-[#004d00] text-white font-black text-sm uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-kenya-green/40 gap-4 group"
                  >
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md">
                      <CommandIcon size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </div>
                    Sign & Submit
                  </Button>

                  <Button 
                    onClick={handleAmplify}
                    className="flex-1 h-16 rounded-2xl bg-[#25D366] hover:bg-[#128C7E] text-white font-black text-sm uppercase tracking-widest gap-2 shadow-xl shadow-[#25D366]/20 transition-transform active:scale-[0.98]"
                  >
                    <ShareIcon size={20} />
                    Amplify
                  </Button>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <button onClick={handleSavePDF} className="flex items-center justify-center h-12 rounded-2xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-kenya-green transition-colors gap-2">
                     <PathIcon size={14} /> Save as PDF
                  </button>
                  <button onClick={() => {
                     const text = `I just formally objected to ${billTitle} on CEKA. Support the cause: `;
                     window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
                  }} className="flex items-center justify-center h-12 rounded-2xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-500 transition-colors gap-2">
                     <UsersIcon size={14} /> Share on X
                  </button>
               </div>
            </div>

            <div className="pt-6 border-t border-black/5 dark:border-white/5 flex items-center justify-between opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
               <p className="text-[9px] font-black uppercase tracking-widest">CEKA v0.10</p>
               <div className="flex gap-4">
                  <KeyIcon size={12} />
                  <ScanIcon size={12} />
                  <BankIcon size={12} />
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Verification Modal */}
      {needsVerification && (
        <SubmissionVerification 
          email={identity.email}
          onVerify={async (code) => {
            const res = await verifyOTP(code);
            if (res) {
              handleFinalDispatch();
              return true;
            }
            return false;
          }}
          onResend={() => {}}
          onCancel={() => {}} 
        />
      )}

      <TemplatesGallery isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} onSelectTemplate={handleSelectTemplate} />
      <TemplateCreator isOpen={isCreatorOpen} onClose={() => setIsCreatorOpen(false)} initialData={{ title: billTitle, body: messageBody, subject: subject, billId: billId }} />
    </div>
  );
};
