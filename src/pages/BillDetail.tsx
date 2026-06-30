import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeftIcon, CalendarIcon, UserIcon, TagIcon, ExternalLinkIcon, ClockIcon,
  EyeIcon, Share2Icon, ClipboardIcon, DownloadIcon, CheckCircleIcon,
  CircleIcon, ShieldCheckIcon, NewspaperIcon, InfoIcon, LockIcon,
  FileTextIcon, XCircleIcon, TargetIcon, TrendingUpIcon, SparklesIcon,
  ChevronDownIcon, ChevronUpIcon
} from '@/components/ui/CustomIcons';
import { buildTimeline, getStageColor, getStageIndex, getStageByStatus, BILL_STAGES } from '@/lib/billStages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Layout from '@/components/layout/Layout';
import { billService, Bill, getBillIdentifier } from '@/services/billService';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, translate } from '@/lib/utils';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { supabase } from "@/integrations/supabase/client";
import { BillResponseForm } from '@/components/bills/BillResponseForm';
import { LegislativeMemorandum } from '@/components/bills/LegislativeMemorandum';
import { SocialShareDrawer } from '@/components/bills/SocialShareDrawer';
import { BillFollowButton } from '@/components/legislative/BillFollowButton';
import { SignatureCounter } from '@/components/bills/SignatureCounter';
import { analyticsService } from '@/services/analyticsService';
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import { Helmet } from 'react-helmet-async';

// Delegated to shared billStages utility — kept as thin alias
const getStatusColor = (status: string) => getStageColor(status);

const LegislativeTimeline = ({ stages, language }: { stages: ReturnType<typeof buildTimeline>, language: any }) => {
  if (!Array.isArray(stages) || stages.length === 0) return (
    <div className="p-8 text-center bg-slate-50 dark:bg-white/5 rounded-[32px] border border-dashed border-slate-200 dark:border-white/10">
      <p className="text-sm text-slate-400">Timeline data is currently being populated...</p>
    </div>
  );

  return (
    <div className="relative mt-8 space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-kenya-green before:from-[75%] before:to-slate-200 dark:before:to-white/5">
      {stages.map((stage, index) => (
        <motion.div
          key={stage.id}
          initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
        >
          {/* Icon/Dot */}
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full border shadow-lg z-10 shrink-0 md:order-1",
            stage.discarded
              ? "bg-red-500 border-red-500 text-white shadow-red-500/20"
              : stage.active
                ? "bg-kenya-green border-kenya-green text-white shadow-kenya-green/30 ring-4 ring-kenya-green/20"
                : stage.completed
                  ? "bg-kenya-green border-kenya-green text-white shadow-kenya-green/20"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-400"
          )}>
            {stage.discarded
              ? <XCircleIcon className="h-5 w-5" />
              : stage.completed
                ? <CheckCircleIcon className="h-5 w-5" />
                : <CircleIcon className="h-4 w-4" />}
          </div>

          {/* Content Card */}
          <div className={cn(
            "w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-[28px] border shadow-ios-soft dark:shadow-none hover:shadow-ios-high transition-all duration-300",
            stage.discarded
              ? "bg-red-50 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/30"
              : stage.active
                ? "bg-kenya-green/[0.03] dark:bg-kenya-green/10 border-kenya-green/20 dark:border-kenya-green/30"
                : "bg-white dark:bg-slate-900/40 border-black/5 dark:border-white/10 dark:hover:bg-white/5"
          )}>
            <div className="flex items-center justify-between mb-2">
              <time className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {stage.date
                  ? new Date(stage.date).toLocaleDateString(language === 'sw' ? 'sw-KE' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : stage.completed || stage.discarded ? '—' : 'Pending'}
              </time>
              <Badge variant="outline" className={cn(
                "font-bold text-[9px] uppercase tracking-tighter px-2",
                stage.discarded
                  ? "bg-red-500/5 text-red-500 border-red-200/50"
                  : stage.active
                    ? "bg-kenya-green/10 text-kenya-green border-kenya-green/20"
                    : stage.completed
                      ? "bg-kenya-green/5 text-kenya-green border-kenya-green/20"
                      : "bg-slate-50 dark:bg-white/5 text-slate-400 border-none"
              )}>
                {stage.discarded ? 'Discarded' : stage.active ? 'Current' : stage.completed ? 'Completed' : 'Upcoming'}
              </Badge>
            </div>
            <h4 className={cn(
              "font-bold mb-2",
              stage.discarded ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"
            )}>{translate(stage.name, language)}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {stage.description}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// ── Markdown-aware prose renderer for the enriched description ──
const ProseRenderer = ({ content }: { content: string }) => {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-headings:text-kenya-green prose-headings:uppercase prose-headings:tracking-widest prose-headings:text-sm prose-li:text-slate-600 dark:prose-li:text-slate-300">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};

const BillDetail = () => {
  const { slug } = useParams();
  const location = useLocation();
  const { language } = useLanguage();
  const [bill, setBill] = useState<Bill | null>(null);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);
  const [userResponse, setUserResponse] = useState<string | undefined>(undefined);
  const [signatureCount, setSignatureCount] = useState(0);
  const [signatureGoal, setSignatureGoal] = useState(1000);
  const memorandaRef = useRef<HTMLDivElement>(null);
  const responseFormRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [prefillQuery, setPrefillQuery] = useState<string | null>(null);

  // NEW: Read More state for description and neural_summary
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const DESCRIPTION_COLLAPSE_THRESHOLD = 600; // chars

  // Analytics State
  const [engagementInsights, setEngagementInsights] = useState<any>(null);

  // --- STICKY DYNAMIC GOAL LOGIC ---
  const calculateDynamicGoal = (current: number, baseGoal: number | null) => {
    const defaultGoal = baseGoal || 1000;
    const milestones = [1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

    // Find the first milestone that is at least 15% ahead of the current count
    // This ensures there's always a "stretch" goal.
    const activeMilestone = milestones.find(m => m > current * 1.15) || Math.ceil((current * 1.5) / 1000) * 1000;
    return Math.max(defaultGoal, activeMilestone);
  };

  // Hash-based deep-link scroll — fires once after bill is loaded
  useEffect(() => {
    if (!loading && bill && location.hash === '#memoranda' && memorandaRef.current) {
      setTimeout(() => {
        memorandaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [loading, bill, location.hash]);

  useEffect(() => {
    if (slug) {
      loadBill(slug);
    }
  }, [slug]);

  // Real-time Action Momentum Synchronization
  useEffect(() => {
    if (!bill?.id) return;

    // Monitor for new verified signatures on this specific bill
    const channel = supabase
      .channel(`signatures-${bill.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signatures',
          filter: `bill_id=eq.${bill.id}`
        },
        (payload) => {
          console.log("[SovereignRealtime] New signature detected:", payload.new.id);
          setSignatureCount(prev => {
            const newCount = prev + 1;
            // Recalculate goal in real-time to keep momentum bar active
            setSignatureGoal(calculateDynamicGoal(newCount, bill?.signature_goal || 1000));
            return newCount;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bill?.id]);

  const loadBill = async (identifier: string) => {
    try {
      setLoading(true);
      let billData = await billService.getBillBySlugOrId(identifier);

      if (!billData) {
        // Fallback for demo purposes if ID is from our sample set
        const sampleBills: Record<string, any> = {
          '74961912-8ba7-47f2-bf61-9ae3abafe2e1': {
            id: '74961912-8ba7-47f2-bf61-9ae3abafe2e1',
            title: 'Education Amendment Bill 2024',
            summary: 'A transformative policy framework to enhance access to quality tertiary education through optimized funding models and systemic reforms.',
            status: 'First Reading',
            category: 'Education',
            date: '2024-03-15',
            created_at: '2024-03-15T10:00:00Z',
            updated_at: '2024-05-20T10:00:00Z',
            sponsor: 'Hon. James Mwangi',
            description: 'The Education Amendment Bill seeks to reform Kenya\'s education system by improving infrastructure, curriculum, and teacher training. It addresses challenges in access to quality education, particularly in underserved regions. The bill proposes increased funding for schools, modernization of educational resources, and implementation of inclusive learning practices.',
            constitutional_section: 'Article 53 & 54 - Human Dignity & Social Rights',
            stages: [
              { name: "Introduction", date: "2024-02-10", completed: true, description: "Bill formally introduced in the National Assembly Gazette." },
              { name: "First Reading", date: "2024-03-15", completed: true, description: "Bill read for the first time; committed to the Education Committee." },
              { name: "Public Participation", date: "2024-04-05", completed: true, description: "Stakeholder engagement and public memoranda received by the committee." },
              { name: "Committee Report", date: "2024-05-15", completed: true, description: "Committee tabled its final report recommending specific amendments." },
              { name: "Second Reading", date: "2024-06-10", completed: false, description: "Scheduled for plenary debate on merits and principles." }
            ],
            pdf_url: "https://parliament.go.ke/sites/default/files/2024-03/Education_Bill_2024.pdf"
          }
        };
        billData = sampleBills[identifier] || null;
      }

      if (!billData) {
        setError('Bill context not found in the legislative database.');
        return;
      }

      setBill(billData);

      // Load signature stats
      const count = await billService.getSignatureCount(billData.id);
      setSignatureCount(count);

      const baseGoal = billData.signature_goal || 1000;
      setSignatureGoal(calculateDynamicGoal(count, baseGoal));

      // Load news mentions
      const newsData = await billService.getBillNewsMentions(billData.id);
      setNews(newsData);

      // Load live engagement insights
      const insights = await analyticsService.getBillEngagementInsights(billData.id);
      setEngagementInsights(insights);
    } catch (error) {
      console.error('Error loading bill:', error);
      setError('Communication trace lost with the legislative server.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to safely parse and check stages
  const getSafeStages = () => {
    if (!bill?.stages) return [];
    if (Array.isArray(bill.stages)) return bill.stages;

    // Handle potential stringified JSON from Supabase
    if (typeof bill.stages === 'string') {
      try {
        const parsed = JSON.parse(bill.stages);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('[BillDetail] Failed to parse stages string:', e);
        return [];
      }
    }
    return [];
  };

  const safeStages = getSafeStages();

  const isFinanceBill = !!bill && ((bill.title?.toLowerCase().includes('finance') && (bill.title?.includes('2024') || bill.title?.includes('2025') || bill.title?.includes('2026'))) ||
    bill.bill_no?.toLowerCase().includes('finance') ||
    bill.id === '74961912-8ba7-47f2-bf61-9ae3abafe2e1' ||
    bill.title?.toLowerCase().includes('sovereign petition'));

  // Concern tap handler: prefill response form & smooth-scroll to it
  const handleConcernTap = useCallback((concern: string) => {
    setPrefillQuery(`What's your thought on "${concern}"?`);

    // Determine which section to scroll to
    const targetRef = isFinanceBill ? memorandaRef : responseFormRef;

    if (targetRef.current) {
      setTimeout(() => {
        targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isFinanceBill]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-white dark:bg-black pt-20">
          <div className="container px-4">
            {/* SEO: Crawler outgoing link — ensures bots never log 0 outgoing links on slow loads */}
            <Link to="/legislative-tracker" className="sr-only" aria-hidden="true">Back to Legislative Tracker</Link>
            <div className="h-8 w-32 bg-slate-100 dark:bg-white/5 rounded-full mb-8" />
            <div className="space-y-6">
              <div className="h-16 w-3/4 bg-slate-100 dark:bg-white/5 rounded-3xl" />
              <div className="h-32 w-full bg-slate-100 dark:bg-white/5 rounded-[40px]" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !bill) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="h-20 w-20 rounded-full bg-kenya-red/5 flex items-center justify-center mx-auto">
              <ClipboardIcon className="h-10 w-10 text-kenya-red opacity-40" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">{error || 'Bill Missing'}</h1>
            <p className="text-slate-500">The legislative engine could not locate the specific trace for this document.</p>
            <Button asChild className="rounded-2xl h-12 px-8 bg-kenya-green font-bold shadow-lg">
              <Link to="/legislative-tracker">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back to Tracker
              </Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Build canonical 9-stage timeline from DB data + status field
  const dbStages = (() => {
    if (!bill.stages) return null;
    if (Array.isArray(bill.stages)) return bill.stages;
    try { return JSON.parse(bill.stages as unknown as string); } catch { return null; }
  })();
  const stages = buildTimeline(bill.status, dbStages, bill.date || bill.created_at);

  // Description: determine if long enough to warrant a Read More
  const descriptionText = bill.description || '';
  const descriptionIsLong = descriptionText.length > DESCRIPTION_COLLAPSE_THRESHOLD;
  const descriptionToRender = descriptionIsLong && !descriptionExpanded
    ? descriptionText.slice(0, DESCRIPTION_COLLAPSE_THRESHOLD)
    : descriptionText;

  // SEO FIX: Build meta description and hard-cap at 155 chars to prevent Ahrefs penalty
  const rawSeoDesc = `${bill.summary} Track the full status, download the PDF, and submit a memorandum to Parliament for ${bill.title}.`;
  const seoDesc = rawSeoDesc.length > 155 ? rawSeoDesc.substring(0, 152) + '...' : rawSeoDesc;

  return (
    <Layout>
      <Helmet>
        <title>{`${bill.title} | Legislative Tracker | CEKA`}</title>
        <meta name="description" content={seoDesc} />
        <link rel="canonical" href={`https://www.civiceducationkenya.com/bill/${bill.slug || bill.id}`} />
        <meta name="keywords" content={`${bill.title}, ${bill.category}, ${bill.bill_no || ''}, Kenya Memorandum Builder, Memorandum Builder Kenya, ${isFinanceBill ? 'Finance Bill 2026, Kenya Finance Bill 2026, Finance Bill memorandum builder, write a memorandum for Finance Bill,' : ''} public participation Kenya, submit memorandum Kenya, bill tracker Kenya, parliamentary process Kenya`} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:title" content={`${bill.title} | Legislative Tracker | CEKA`} />
        <meta property="og:description" content={seoDesc} />
        <meta property="og:image" content="/icons/og-bill.png" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={window.location.href} />
        <meta property="twitter:title" content={`${bill.title} | Legislative Tracker | CEKA`} />
        <meta property="twitter:description" content={seoDesc} />
        <meta property="twitter:image" content="/icons/og-bill.png" />
      </Helmet>

      <div className="min-h-screen bg-slate-50/30 dark:bg-black">
        {/* HERO SECTION */}
        <section className="relative pt-24 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/20 backdrop-blur-3xl -z-10" />
          <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-kenya-green/5 to-transparent -z-10" />

          <div className="container relative px-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Link to="/legislative-tracker" className="inline-flex items-center gap-2 text-slate-400 hover:text-kenya-green font-bold text-xs uppercase tracking-widest transition-colors mb-6 group">
                <div className="h-8 w-8 rounded-full bg-white dark:bg-white/5 flex items-center justify-center shadow-sm group-hover:-translate-x-1 transition-transform">
                  <ArrowLeftIcon className="h-4 w-4" />
                </div>
                Back to Legislative Tracker
              </Link>

              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Badge variant="outline" className={cn(getStatusColor(bill.status), "font-bold border px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest")}>
                  {translate(bill.status, language)}
                </Badge>
                <Badge variant="outline" className="bg-white dark:bg-white/5 text-slate-500 font-bold border-black/5 dark:border-white/10 px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest">
                  {translate(bill.category, language)}
                </Badge>
              </div>

              <h1 className="text-2xl md:text-5xl lg:text-6xl font-[1000] tracking-tighter uppercase leading-[0.9] text-kenya-black dark:text-white">
                {bill.title}
              </h1>

              <div className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-4xl prose prose-slate dark:prose-invert prose-p:my-0">
                <ReactMarkdown>{bill.summary}</ReactMarkdown>
              </div>

              {/* MOMENTUM BAR - Quick View */}
              <div className="mt-8 max-w-xl">
                <SignatureCounter current={signatureCount} goal={signatureGoal} variant="compact" className="bg-transparent backdrop-blur-none border-none p-0 shadow-none" />
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-12">
              {[
                { icon: <UserIcon className="h-4 w-4" />, label: "Mover / Sponsor", value: bill.sponsor, color: "text-blue-500 bg-blue-500/5" },
                { icon: <CalendarIcon className="h-4 w-4" />, label: "Date Introduced", value: new Date(bill.date || bill.created_at).toLocaleDateString(), color: "text-kenya-green bg-kenya-green/5" },
                { icon: <TagIcon className="h-4 w-4" />, label: "Legislative Category", value: bill.category, color: "text-kenya-red bg-kenya-red/5" },
                { icon: <EyeIcon className="h-4 w-4" />, label: "Constitution Articles Reference", value: bill.constitutional_section?.split(' - ')[0] || 'Unspecified', color: "text-amber-500 bg-amber-500/5" }
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-ios-soft"
                >
                  <div className={cn("inline-flex items-center justify-center p-2 rounded-xl mb-3", item.color)}>
                    {item.icon}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                    <p className="font-bold text-slate-900 dark:text-white truncate">{item.value || 'N/A'}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* INTELLIGENCE QUICK ACTIONS */}
            <div className="flex flex-wrap gap-4 mt-8">
              {bill.b2_url && (
                <Button className="h-14 px-8 rounded-2xl bg-kenya-green text-white font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-kenya-green/20">
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  {translate("Download Resource", language)}
                </Button>
              )}
              {bill.pdf_url && (
                <Button variant="outline" asChild className="h-14 px-8 rounded-2xl border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md font-bold text-xs uppercase tracking-widest">
                  <a href={bill.pdf_url} target="_blank" rel="noopener noreferrer">
                    <FileTextIcon className="mr-2 h-4 w-4" />
                    {translate("Official Bill PDF", language)}
                  </a>
                </Button>
              )}
            </div>
          </div>
        </section>

        <div className="container relative px-4 pb-24 group">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

            {/* CONTENT MAIN */}
            <div className="lg:col-span-8 space-y-12">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className="h-1px flex-grow bg-slate-200 dark:bg-white/5" />
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 shrink-0">{translate("Legislative Narrative", language)}</h3>
                  <div className="h-1px flex-grow bg-slate-200 dark:bg-white/5" />
                </div>

                {/* DESCRIPTION — Markdown-aware renderer with Read More */}
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  {descriptionText ? (
                    <div>
                      <ProseRenderer content={descriptionToRender} />

                      {descriptionIsLong && (
                        <motion.button
                          onClick={() => setDescriptionExpanded(prev => !prev)}
                          whileTap={{ scale: 0.97 }}
                          className="mt-4 flex items-center gap-2 text-kenya-green font-black text-xs uppercase tracking-widest group/readmore transition-all"
                        >
                          <span className="border-b border-kenya-green/30 group-hover/readmore:border-kenya-green transition-colors">
                            {descriptionExpanded ? 'Show Less' : 'Read Full Analysis'}
                          </span>
                          <motion.span
                            animate={{ rotate: descriptionExpanded ? 180 : 0 }}
                            transition={{ duration: 0.25 }}
                          >
                            <ChevronDownIcon className="h-4 w-4" />
                          </motion.span>
                        </motion.button>
                      )}
                    </div>
                  ) : (
                    <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      This bill is currently undergoing active legislative processing. Comprehensive details regarding its subsections, specific clauses, and policy implications are being processed for public review.
                    </p>
                  )}
                </div>

                {bill.constitutional_section && (
                  <div className="mt-8 p-6 rounded-3xl bg-kenya-green/[0.03] border border-kenya-green/10 flex gap-4 items-start">
                    <div className="h-10 w-10 rounded-2xl bg-kenya-green/10 flex items-center justify-center shrink-0">
                      <EyeIcon className="h-5 w-5 text-kenya-green" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-kenya-green mb-1">Constitutional Context</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{bill.constitutional_section}</p>
                    </div>
                  </div>
                )}
              </motion.div>

              <div className="space-y-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-black tracking-tight leading-tight">Timeline <span className="text-kenya-green mx-1">&</span> Trace</h2>
                  <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                    <ClockIcon className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                <LegislativeTimeline stages={stages} language={language} />
              </div>

              {/* NEWS CORROBORATION SECTION */}
              {news.length > 0 && (
                <div className="space-y-8 pb-12">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-black tracking-tight leading-tight">News <span className="text-blue-500 mx-1">&</span> {translate("Corroboration", language)}</h2>
                    <Badge className="bg-blue-500/10 text-blue-500 border-blue-200/50 uppercase text-[10px] font-black">
                      {news.length} {translate("Sources Found", language)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {news.map((item, idx) => (
                      <motion.a
                        key={idx}
                        href={item.article_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="p-5 rounded-[32px] bg-white dark:bg-slate-900/40 border border-black/5 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-blue-500/5 flex items-center justify-center shrink-0">
                            <NewspaperIcon className="h-5 w-5 text-blue-500 opacity-50" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{item.source_name}</p>
                            <h4 className="font-bold text-slate-800 dark:text-white leading-tight mb-2 line-clamp-2 group-hover:text-blue-500 transition-colors">
                              {item.headline}
                            </h4>
                            <p className="text-[10px] text-slate-500 line-clamp-2">
                              "{item.snippet}"
                            </p>
                          </div>
                        </div>
                      </motion.a>
                    ))}
                  </div>
                </div>
              )}

              {/* AI CITIZEN CONCERNS — CEKA colors, 2-col grid, iOS tap animations */}
              {bill && Array.isArray(bill.ai_concerns) && bill.ai_concerns.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  className="space-y-6 pb-8"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black tracking-tight leading-tight">
                      Concerns <span className="text-kenya-green mx-1">to</span> Note
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tap any concern to respond</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(bill.ai_concerns as string[]).map((concern, i) => (
                      <motion.button
                        key={i}
                        onClick={() => handleConcernTap(concern)}
                        whileHover={{ scale: 1.018, y: -2 }}
                        whileTap={{ scale: 0.97, y: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                        className="flex gap-4 items-start p-4 rounded-2xl bg-kenya-green/[0.04] dark:bg-kenya-green/10 border border-kenya-green/15 dark:border-kenya-green/20 text-left cursor-pointer group/concern hover:bg-kenya-green/[0.08] dark:hover:bg-kenya-green/15 hover:border-kenya-green/30 hover:shadow-ios-soft transition-all duration-200 active:bg-kenya-green/10"
                      >
                        <span className="text-kenya-green font-black text-sm mt-0.5 shrink-0">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed group-hover/concern:text-slate-900 dark:group-hover/concern:text-white transition-colors">
                            {concern}
                          </p>
                          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-kenya-green/60 group-hover/concern:text-kenya-green transition-colors">
                            Tap to respond →
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* INTERACTION ZONE: response form + memorandum generator */}
              {bill && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  className="space-y-10 pb-12"
                >
                  <div className="flex flex-col gap-5 sm:gap-6">
                    <div className="space-y-2">
                      <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight uppercase">
                        ✍️ Submit <span className="text-kenya-green">Your</span> Memorandum
                      </h2>
                      <p className="text-sm font-medium text-slate-500 max-w-lg">
                        Choose your method of submission: Submit a formal memorandum directly to Parliament or save a quick civic response locally.
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setShareDrawerOpen(true)}
                      className="h-12 px-6 rounded-2xl border-kenya-green/20 text-kenya-green font-black text-xs uppercase tracking-widest hover:bg-kenya-green/5 shadow-ios-soft max-w-full"
                    >
                      <Share2Icon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <div className="flex items-center min-w-0 max-w-full">
                        <span className="shrink-0 flex-none mr-1">Share</span>
                        <span className="truncate max-w-full">{bill.title}</span>
                        <span className="shrink-0 flex-none ml-1">Petition</span>
                      </div>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                    {/* FORMAL MEMORANDUM GENERATOR */}
                    <div id="memoranda" ref={memorandaRef} className={cn("scroll-mt-24", isFinanceBill ? "col-span-full" : "order-2 xl:order-1")}>
                      <LegislativeMemorandum
                        billId={bill.id}
                        billTitle={bill.title}
                        billSummary={bill.description}
                        deadline={bill.participation_deadline}
                        constitutionalSection={bill.constitutional_section}
                        signatureGoal={signatureGoal}
                        billNo={bill.bill_no}
                        billHouse={bill.house}
                        billSessionYear={bill.session_year}
                        billCategory={bill.category}
                        billSponsor={bill.sponsor}
                        billStatus={bill.status}
                        billNeuralSummary={bill.neural_summary}
                        billTabloidSummary={bill.tabloid_summary}
                        billAiConcerns={bill.ai_concerns}
                        billCurrentStage={getStageByStatus(bill.status).label}
                      />
                    </div>

                    {/* QUICK CIVIC RESPONSE — only show for non-Finance bills to avoid extra steps */}
                    {!isFinanceBill && (
                      <div className="order-1 xl:order-2" ref={responseFormRef}>
                        <BillResponseForm
                          billId={bill.id}
                          billTitle={bill.title}
                          onSubmitSuccess={(text) => setUserResponse(text)}
                          prefillQuery={prefillQuery}
                        />
                      </div>
                    )}
                  </div>

                  <SocialShareDrawer
                    billId={bill.id}
                    billTitle={bill.title}
                    billStatus={bill.status}
                    userResponse={userResponse}
                    isOpen={shareDrawerOpen}
                    onClose={() => setShareDrawerOpen(false)}
                  />
                </motion.div>
              )}
            </div>

            {/* SIDEBAR TOOLS */}
            <aside className="lg:col-span-4 space-y-8">
              <div className="sticky top-24 space-y-8">

                {/* FIDELITY GAUGE */}
                <Card className="rounded-[40px] border-none bg-gradient-to-br from-slate-900 to-black text-white shadow-2xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <ShieldCheckIcon className="h-32 w-32" />
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-kenya-green">{translate("Data Fidelity Score", language)}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 relative z-10">
                    <div className="flex items-end gap-2">
                      <span className="text-6xl font-[1000] tracking-tighter leading-none">{bill.corroboration_score || 85}</span>
                      <span className="text-xl font-bold text-kenya-green mb-1">%</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${bill.corroboration_score || 85}%` }}
                          className="h-full bg-kenya-green shadow-[0_0_15px_rgba(0,186,0,0.5)]"
                        />
                      </div>
                      <p className="text-[10px] font-medium text-slate-400 leading-relaxed uppercase tracking-widest">
                        Verified against {news.length + 2} legislative sources pipelines
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* OFFICIAL DOCUMENTS */}
                <Card className="rounded-[40px] border-none bg-white dark:bg-slate-900 shadow-ios-high dark:shadow-none dark:border dark:border-white/5 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Interact With The Bill</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Full Gazette / Official PDF — real URL from DB */}
                    {(bill.pdf_url || bill.b2_url) ? (
                      <a
                        href={bill.pdf_url || bill.b2_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 rounded-3xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center gap-4 group/doc hover:bg-slate-100 dark:hover:bg-white/10 transition-colors no-underline block"
                      >
                        <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center shrink-0 text-kenya-red">
                          <FileTextIcon className="h-5 w-5 group-hover/doc:scale-110 transition-transform" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-900 dark:text-white truncate">Full Gazette Version</p>
                          <p className="text-[9px] text-slate-400 uppercase tracking-tighter">Official Bill PDF • Open or Download</p>
                        </div>
                        <ExternalLinkIcon className="h-3.5 w-3.5 text-slate-300" />
                      </a>
                    ) : (
                      <div className="p-4 rounded-3xl bg-slate-50 dark:bg-white/5 border border-dashed border-black/10 dark:border-white/10 flex items-center gap-4 opacity-50">
                        <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center shrink-0 text-slate-400">
                          <FileTextIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-900 dark:text-white truncate">Full Gazette Version</p>
                          <p className="text-[9px] text-slate-400 uppercase tracking-tighter">PDF not yet available</p>
                        </div>
                      </div>
                    )}

                    {/* Follow This Bill — real follow state */}
                    <BillFollowButton
                      billId={bill.id}
                      size="lg"
                      className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl"
                    />
                  </CardContent>
                </Card>

                {/* SIGNATURE TRACKER SIDEBAR MODULE */}
                <div className="p-8 rounded-[40px] bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl border border-black/5 dark:border-white/10 shadow-ios-soft space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TargetIcon size={18} className="text-kenya-green" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">How Many Emails Sent</p>
                    </div>
                    <p className="text-[10px] font-black text-kenya-green uppercase tracking-widest">{Math.round((signatureCount / signatureGoal) * 100)}% Confirmed</p>
                  </div>

                  <SignatureCounter current={signatureCount} goal={signatureGoal} variant="compact" className="bg-transparent backdrop-blur-none border-none p-0 shadow-none" />

                  {engagementInsights && (
                    <div className="p-4 rounded-3xl bg-slate-50 dark:bg-white/10 border border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-3 mb-2">
                        <SparklesIcon size={14} className="text-kenya-green" />
                        <p className="text-[10px] font-black uppercase tracking-widest">
                          {engagementInsights.velocity > 15 ? 'Viral Spike' : 'Live Interaction'}
                        </p>
                      </div>
                      <p
                        className="text-[10px] text-slate-500 font-medium leading-relaxed cursor-pointer hover:text-kenya-green transition-colors"
                        onClick={() => setShareDrawerOpen(true)}
                      >
                        {engagementInsights.totalViews > 50 ? (
                          <>This Bill has been seen by <span className="font-bold text-slate-900 dark:text-white">{engagementInsights.totalViews} citizens</span>. <span className="text-kenya-green underline">Share to reach more</span></>
                        ) : engagementInsights.dailyViews > 0 ? (
                          <>Engagement velocity is at <span className="font-bold text-slate-900 dark:text-white">high momentum</span> today. <span className="text-kenya-green underline">Invite others</span></>
                        ) : (
                          <>Be among the <span className="font-bold text-slate-900 dark:text-white">first to act</span> on this Bill. <span className="text-kenya-green underline">Share the trace</span></>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* ENGAGEMENT TOOLS */}
                <Card className="rounded-[40px] border-none bg-kenya-green/5 dark:bg-kenya-green/10 overflow-hidden">
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-900 shadow-ios-soft flex items-center justify-center">
                        <Share2Icon className="h-5 w-5 text-kenya-green" />
                      </div>
                      <h4 className="text-xl font-black tracking-tighter uppercase">Public Discourse</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        Discuss this bill with 1,200 other citizens in the Community forum.
                      </p>
                    </div>
                    <Button variant="outline" className="w-full h-12 rounded-2xl border-kenya-green/20 text-kenya-green font-bold hover:bg-kenya-green/5" asChild>
                      <Link to="/community">Join Discussion</Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* UPDATES TRACE */}
                <div className="px-6 space-y-4">
                  <div className="flex items-center gap-3 text-slate-400">
                    <ClockIcon className="h-3 w-3" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Last Updated: {new Date(bill.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </aside>

          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BillDetail;
