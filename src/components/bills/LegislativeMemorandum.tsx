import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Send, Mail, FileText, CheckCircle, User, AlertTriangle, Scale, Users, 
  ArrowUpRight, Info, Save, Edit2, ShieldCheck, MailPlus, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TemplateCreator } from "./TemplateCreator";
import { TemplatesGallery } from "./TemplatesGallery";

interface LegislativeMemorandumProps {
  billId: string;
  billTitle: string;
  billSummary: string;
}

export const LegislativeMemorandum: React.FC<LegislativeMemorandumProps> = ({
  billId,
  billTitle,
  billSummary,
}) => {
  const [userName, setUserName] = useState('');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState({
    clerk: true,
    financeCommittee: true
  });
  const [customEmails, setCustomEmails] = useState<{id: number, address: string}[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);

  useEffect(() => {
    setSubject(`RE: MEMORANDUM OF OBJECTION TO ${billTitle.toUpperCase()}`);
    
    const template = `Dear Clerk of the National Assembly and Members of the Finance Committee,

The above subject refers;

Pursuant to Articles 10(2), 118(1) of the Constitution 2010 that mandates Public Participation in any Legislative Process I wish to submit my Memoranda as follows:

Regarding: ${billTitle}
Context: ${billSummary}

In conclusion, I call for the withdrawal of this Bill as it is made in Bad Faith, ignorant to the Current Economic Needs and Political Wills of the People of Kenya. I thus pray that you Reject it for the sake of a better Kenya.

Yours Faithfully,

[USER_NAME_PLACEHOLDER]

Citizen of Kenya`;
    
    setMessageBody(template);
  }, [billTitle, billSummary]);

  const recipients = {
    clerk: { name: "Clerk of the National Assembly", email: "cna@parliament.go.ke" },
    financeCommittee: { name: "Finance Committee", email: "financecommitteena@parliament.go.ke" }
  };

  const handleRecipientChange = (recipient: 'clerk' | 'financeCommittee', checked: boolean) => {
    setSelectedRecipients(prev => ({ ...prev, [recipient]: checked }));
  };

  const getRecipientEmails = () => {
    const emails: string[] = [];
    if (selectedRecipients.clerk) emails.push(recipients.clerk.email);
    if (selectedRecipients.financeCommittee) emails.push(recipients.financeCommittee.email);
    customEmails.forEach(e => emails.push(e.address));
    return emails;
  };

  const isDesktop = () => !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const handleSelectTemplate = (template: any) => {
    // We don't have a setTitle state, we use billTitle for the UI but update subject/body for the mail
    setSubject(template.metadata?.subject || `RE: MEMORANDUM OF OBJECTION TO ${template.title.toUpperCase()}`);
    setMessageBody(template.body);
    setCurrentTemplateId(template.id);
    setIsGalleryOpen(false);
    toast({
      title: "Intelligence Synchronized",
      description: "Using community-verified memorandum template.",
    });
  };

  const handleSendEmail = async () => {
    if (!userName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your full name to complete the objection letter",
        variant: "destructive"
      });
      return;
    }

    const selectedEmails = getRecipientEmails();
    if (selectedEmails.length === 0) {
      toast({
        title: "Select Recipients",
        description: "Please select at least one recipient",
        variant: "destructive"
      });
      return;
    }

    // Track Action
    try {
      // @ts-ignore - RPC functions added via custom SQL
      await supabase.rpc('increment_user_action', { action_type_param: 'email_sent' });
      if (currentTemplateId) {
        // @ts-ignore - RPC functions added via custom SQL
        await supabase.rpc('increment_template_usage', { template_id: currentTemplateId });
      }
    } catch (e) {
      console.error('Tracking failed:', e);
    }

    const to = selectedEmails.join(',');
    const encodedSubject = encodeURIComponent(subject);
    const personalizedMessage = messageBody.replace('[USER_NAME_PLACEHOLDER]', userName.trim());
    const encodedBody = encodeURIComponent(personalizedMessage);
    
    if (isDesktop()) {
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodedSubject}&body=${encodedBody}`;
      const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodedSubject}&body=${encodedBody}`;
      
      const userAgent = navigator.userAgent.toLowerCase();
      
      if (userAgent.includes('chrome') || userAgent.includes('edge')) {
        window.open(gmailUrl, '_blank');
      } else if (userAgent.includes('outlook') || userAgent.includes('office')) {
        window.open(outlookUrl, '_blank');
      } else {
        window.location.href = `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
      }
    } else {
      window.location.href = `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
    }
    
    toast({
      title: "Opening Email App",
      description: "Your official memorandum is ready to send!",
    });
  };

  const addCustomEmail = () => {
    if (!newEmail.includes('@')) return;
    setCustomEmails([...customEmails, { id: Date.now(), address: newEmail }]);
    setNewEmail('');
    setIsAddingEmail(false);
  };

  return (
    <Card className="rounded-[32px] border-none bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl shadow-ios-high dark:shadow-none dark:border dark:border-white/10 overflow-hidden">
      <CardHeader className="pb-4 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-kenya-green flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Official Memorandum
          </CardTitle>
          <div className="flex items-center gap-2">
             <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsGalleryOpen(true)}
                className="h-8 rounded-lg text-slate-400 hover:text-kenya-green text-[9px] font-black uppercase tracking-widest gap-2"
             >
                <Users size={14} />
                Gallery
             </Button>
             <div className="h-4 w-[1px] bg-black/5 dark:bg-white/5" />
             <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsCreatorOpen(true)}
                className="h-8 rounded-lg text-slate-400 hover:text-gold text-[9px] font-black uppercase tracking-widest gap-2"
             >
                <MailPlus size={14} />
                Share Template
             </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {/* User Identity */}
        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Citizen Identifier
          </Label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-kenya-green transition-colors">
              <User size={16} />
            </div>
            <Input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Full Name (Legal/Initials)"
              className="pl-11 h-12 rounded-2xl border-none bg-slate-100 dark:bg-white/5 focus:ring-2 focus:ring-kenya-green/30 transition-all font-bold"
            />
          </div>
        </div>

        {/* Recipients */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Submit To
            </Label>
            <button 
              onClick={() => setIsAddingEmail(true)}
              className="text-[10px] font-bold text-kenya-green hover:underline flex items-center gap-1"
            >
              <MailPlus size={10} /> Add Target
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'clerk', label: 'Clerk of NA', email: recipients.clerk.email },
              { id: 'financeCommittee', label: 'Finance Committee', email: recipients.financeCommittee.email }
            ].map((target) => (
              <div 
                key={target.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer",
                  selectedRecipients[target.id as keyof typeof selectedRecipients]
                    ? "bg-kenya-green/5 border-kenya-green/20"
                    : "bg-slate-50 dark:bg-white/5 border-transparent"
                )}
                onClick={() => handleRecipientChange(target.id as any, !selectedRecipients[target.id as keyof typeof selectedRecipients])}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-xl flex items-center justify-center transition-colors",
                    selectedRecipients[target.id as keyof typeof selectedRecipients]
                      ? "bg-kenya-green text-white"
                      : "bg-slate-200 dark:bg-white/10 text-slate-400"
                  )}>
                    <Mail size={14} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black leading-none mb-1">{target.label}</p>
                    <p className="text-[9px] text-slate-400 uppercase tracking-tighter">{target.email}</p>
                  </div>
                </div>
                <Checkbox 
                  checked={selectedRecipients[target.id as keyof typeof selectedRecipients]}
                  className="rounded-full border-slate-300 dark:border-white/20 data-[state=checked]:bg-kenya-green data-[state=checked]:border-kenya-green"
                />
              </div>
            ))}

            {/* Custom Emails */}
            {customEmails.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                <div className="flex items-center gap-3 text-blue-500">
                  <Mail size={14} />
                  <p className="text-[11px] font-bold">{e.address}</p>
                </div>
                <button onClick={() => setCustomEmails(customEmails.filter(x => x.id !== e.id))}>
                  <X size={12} className="text-slate-400" />
                </button>
              </div>
            ))}

            {isAddingEmail && (
              <div className="flex gap-2 p-2">
                <Input 
                  autoFocus
                  placeholder="custom@email.com" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomEmail()}
                  className="h-9 rounded-xl text-xs"
                />
                <Button size="sm" onClick={addCustomEmail} className="h-9 rounded-xl bg-kenya-green text-white px-3 font-bold">Add</Button>
              </div>
            )}
          </div>
        </div>

        {/* Form Content */}
        <div className="space-y-4">
          <div className="space-y-2">
             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Subject Line
            </Label>
            <div className="relative">
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-10 rounded-xl border-none bg-slate-100 dark:bg-white/5 text-[11px] font-bold pr-10"
              />
              <Edit2 size={12} className="absolute right-3 top-3 text-slate-400" />
            </div>
          </div>

          <div className="space-y-2">
             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Objection Body
            </Label>
            <Textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="min-h-[200px] rounded-[24px] border-none bg-slate-100 dark:bg-white/5 text-xs leading-relaxed p-5 green-scrollbar"
            />
          </div>
        </div>

        {/* Action Button */}
        <Button 
          onClick={handleSendEmail}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-kenya-green to-[#004d00] text-white font-black text-sm uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-kenya-green/30 gap-3 group"
        >
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
            <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </div>
          Submit Official Memorandum
        </Button>

        <p className="text-[10px] text-center text-slate-400 uppercase tracking-widest font-medium">
          Generated via Sovereign Intelligence • No Data Retained
        </p>

        <TemplatesGallery 
          isOpen={isGalleryOpen} 
          onClose={() => setIsGalleryOpen(false)} 
          onSelectTemplate={handleSelectTemplate}
        />

        <TemplateCreator 
          isOpen={isCreatorOpen} 
          onClose={() => setIsCreatorOpen(false)} 
          initialData={{
            title: billTitle,
            body: messageBody,
            subject: subject,
            billId: billId
          }}
        />
      </CardContent>
    </Card>
  );
};
