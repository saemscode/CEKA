import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Save, Eye, Share2, FileText, Plus, X, ShieldCheck,
  Globe, Lock, Copy, CheckCircle2, Layout, Zap
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TemplateCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    title?: string;
    body?: string;
    subject?: string;
    billId?: string;
  };
}

export const TemplateCreator: React.FC<TemplateCreatorProps> = ({
  isOpen,
  onClose,
  initialData
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [body, setBody] = useState(initialData?.body || '');
  const [subject, setSubject] = useState(initialData?.subject || '');
  const [customSlug, setCustomSlug] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareableUrl, setShareableUrl] = useState('');

  const generateSlug = (titleText: string) => {
    return titleText
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  };

  const handleSaveTemplate = async () => {
    if (!title.trim() || !body.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and body for your template",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const slug = customSlug || generateSlug(title);
      const metadata = {
        subject: subject || '',
        billId: initialData?.billId || null,
        originalApp: 'ceka-sovereign',
        tags: ['legislative', 'memorandum', 'citizen-action']
      };

      const { data, error } = await supabase
        // @ts-ignore - Table added via custom SQL
        .from('templates')
        .insert({
          title,
          body,
          slug,
          metadata,
          is_public: isPublic,
          created_by: user?.id || null,
          is_verified: false
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "URL Already Taken",
            description: "This URL slug is already in use. Please choose a different one.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      if (data) {
        // @ts-ignore - Slug/id property existence confirmed in SQL
        const url = `${window.location.origin}/template/${data.slug || data.id}`;
        setShareableUrl(url);
        setShowShareDialog(true);

        toast({
          title: "Template Published!",
          description: "Your memorandum template is now part of the Sovereign Gallery.",
        });
      }

    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Save Failed",
        description: "There was an error saving your template. Please check your connection.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      toast({
        title: "Link Copied!",
        description: "Shareable link is ready for distribution.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please manually copy the link.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-none shadow-ios-high rounded-[32px]">
          <div className="flex flex-col h-[85vh]">
            {/* Header */}
            <div className="px-8 py-6 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex items-center justify-between">
              <DialogHeader>
                <DialogTitle className="text-sm font-black uppercase tracking-[0.2em] text-kenya-green flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  CEKA Community Template Creator
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-kenya-green animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Draft</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 green-scrollbar">
              {/* Identity & Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Zap className="h-3 w-3 text-gold" /> Template Title
                  </Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Finance Bill Objection 2026"
                    className="h-12 rounded-2xl border-none bg-slate-100 dark:bg-white/5 focus:ring-2 focus:ring-kenya-green/30 transition-all font-bold"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Subject Line (Email)
                  </Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject of the Memorandum"
                    className="h-12 rounded-2xl border-none bg-slate-100 dark:bg-white/5 focus:ring-2 focus:ring-kenya-green/30 transition-all font-bold"
                  />
                </div>
              </div>

              {/* URL Customization */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Name Your Template URL (/slug)
                </Label>
                <div className="flex items-center gap-3 p-1 rounded-2xl bg-slate-100 dark:bg-white/5">
                  <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/50 dark:bg-white/5 rounded-xl">
                    /template/
                  </div>
                  <Input
                    value={customSlug}
                    onChange={(e) => setCustomSlug(generateSlug(e.target.value))}
                    placeholder="custom-identifier"
                    className="border-none bg-transparent h-10 font-mono text-xs focus-visible:ring-0"
                  />
                </div>
              </div>

              {/* Body */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Memorandum Body (Supports placeholders)
                </Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Enter the template message content here..."
                  className="min-h-[300px] rounded-[24px] border-none bg-slate-100 dark:bg-white/5 text-xs font-mono leading-relaxed p-6 green-scrollbar"
                />
              </div>

              {/* Visibility */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-kenya-green/5 border border-kenya-green/10">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                    isPublic ? "bg-kenya-green text-white" : "bg-slate-200 dark:bg-white/10 text-slate-400"
                  )}>
                    {isPublic ? <Globe size={20} /> : <Lock size={20} />}
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest">
                      {isPublic ? "Public Availability" : "Private Draft"}
                    </p>
                    <p className="text-[9px] text-slate-400 uppercase tracking-tighter">
                      {isPublic ? "Visible in the Community Gallery" : "Only accessible via direct link"}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 rounded-lg border-slate-300 dark:border-white/20 text-kenya-green focus:ring-kenya-green"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 border-t border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex items-center justify-between">
              <p className="text-[9px] text-slate-400 uppercase font-bold flex items-center gap-2">
                <ShieldCheck className="h-3 w-3 text-gold" />
                Your Template will be open to checks by the Community - so give it your best shot!
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={onClose} className="rounded-xl text-[10px] font-black uppercase tracking-widest">
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTemplate}
                  disabled={isSaving || !title.trim() || !body.trim()}
                  className="h-12 px-8 rounded-2xl bg-midnight text-white font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {isSaving ? "Saving..." : "Publish Template"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md rounded-[32px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-none shadow-ios-high p-8 text-center space-y-6">
          <div className="h-16 w-16 bg-kenya-green/10 text-kenya-green rounded-3xl mx-auto flex items-center justify-center">
            <CheckCircle2 size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black uppercase tracking-tight">Template Link Ready</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              We've received your template & are now putting it before other CEKA Community members to interact with securely. Anyone with this link can now use this template to submit their memorandum. Share your creation!
            </p>
          </div>

          <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl break-all font-mono text-[10px] text-slate-600 dark:text-slate-400 relative group overflow-hidden">
            {shareableUrl}
            <div className="absolute inset-0 bg-kenya-green items-center justify-center hidden group-hover:flex transition-opacity">
              <span className="text-white font-black text-[10px] uppercase tracking-widest">Copy URL slug</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleCopyLink} className="flex-1 h-12 rounded-2xl bg-midnight text-white font-black text-[10px] uppercase tracking-widest">
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button variant="outline" onClick={() => window.open(shareableUrl, '_blank')} className="flex-1 h-12 rounded-2xl border-black/5 dark:border-white/10 font-black text-[10px] uppercase tracking-widest">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
