import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  FileText, Eye, Send, Search, Calendar, ExternalLink, 
  ChevronRight, Filter, Zap, Layout
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  slug: string | null;
  title: string;
  body: string;
  metadata: any;
  created_at: string;
  views_count: number;
  uses_count: number;
  is_verified?: boolean;
}

interface TemplatesGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate?: (template: Template) => void;
}

export const TemplatesGallery: React.FC<TemplatesGalleryProps> = ({ 
  isOpen, 
  onClose,
  onSelectTemplate
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      // @ts-ignore - Table added via custom SQL
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTemplates((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUseTemplate = (template: Template) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    } else {
      const url = `/template/${template.slug || template.id}`;
      window.open(url, '_blank');
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-none shadow-ios-high rounded-[32px]">
        <div className="flex flex-col h-[85vh]">
          {/* Header */}
          <div className="px-8 py-6 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex items-center justify-between">
            <DialogHeader>
              <DialogTitle className="text-sm font-black uppercase tracking-[0.2em] text-kenya-green flex items-center gap-2">
                <Layout className="h-4 w-4" />
                Community Template Gallery
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-4">
               <div className="relative group hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 w-64 rounded-xl border-none bg-slate-100 dark:bg-white/5 text-[11px] font-bold"
                />
              </div>
              <Button variant="ghost" onClick={onClose} className="rounded-xl h-10 w-10 p-0 text-slate-400">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Search Mobile */}
          <div className="p-4 border-b border-black/5 md:hidden">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 rounded-2xl border-none bg-slate-100 dark:bg-white/5 text-[11px] font-bold"
                />
              </div>
          </div>

          {/* Grid Content */}
          <div className="flex-1 overflow-y-auto p-8 green-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <Zap className="h-12 w-12 text-gold mb-4 animate-bounce" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Intelligence...</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <FileText className="h-20 w-20 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">No templates found in galaxy</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-8">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="group rounded-[28px] border-none bg-slate-50 dark:bg-white/5 hover:bg-white/50 dark:hover:bg-white/10 transition-all shadow-none hover:shadow-ios-soft">
                    <CardHeader className="pb-3 border-b border-black/5 dark:border-white/5">
                      <div className="flex items-center justify-between mb-2">
                         <div className="h-8 w-8 rounded-xl bg-kenya-green/10 text-kenya-green flex items-center justify-center">
                            <FileText size={16} />
                         </div>
                         {template.is_verified && (
                           <Badge className="bg-gold text-midnight text-[8px] font-bold rounded-lg border-none">VERIFIED</Badge>
                         )}
                      </div>
                      <CardTitle className="text-sm font-black leading-tight line-clamp-2 uppercase tracking-wide">
                        {template.title}
                      </CardTitle>
                      <div className="flex items-center gap-3 mt-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <div className="flex items-center gap-1">
                          <Eye className="h-2.5 w-2.5" />
                          {template.views_count}
                        </div>
                        <div className="flex items-center gap-1">
                          <Send className="h-2.5 w-2.5" />
                          {template.uses_count}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(template.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-6 line-clamp-4 font-medium h-[68px]">
                        {truncateText(template.body, 180)}
                      </p>
                      
                      {template.metadata?.tags && (
                        <div className="flex flex-wrap gap-2 mb-6">
                          {template.metadata.tags.slice(0, 2).map((tag: string, index: number) => (
                            <div key={index} className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
                              #{tag}
                            </div>
                          ))}
                        </div>
                      )}

                      <Button
                        onClick={() => handleUseTemplate(template)}
                        className="w-full h-11 rounded-2xl bg-midnight text-white font-black text-[10px] uppercase tracking-widest group-hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        <Zap className="h-3.5 w-3.5 mr-2 text-gold" />
                        Use Intelligence
                        <ChevronRight className="h-3.5 w-3.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Footer stats */}
          <div className="px-8 py-4 border-t border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex items-center justify-center">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Sovereign Intelligence Gallery • Total Reach: {templates.reduce((acc, t) => acc + (t.uses_count || 0), 0)} Households
             </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Internal X icon fix
const X = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
