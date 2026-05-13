import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from "lottie-react";
import {
  BankIcon, CommentsIcon, LocationIcon, KeyIcon,
  SearchIcon, StarIcon, CloseIcon, SparklesIcon, IOSLoadingIcon, IOSTickIcon
} from "../ui/CustomIcons";
import {
  DetailsIcon, LibraryIcon, PenNewSquareIcon, AddRowIcon, RemoveRowIcon,
  MailOpenAltIcon, Send2Icon, Share2Icon, SaveAddIcon,
  TwitterColorIcon, SecureShieldIcon, SecurePCIcon, MailSendIcon
} from "../ui/CustomIcons";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TemplateCreator } from "./TemplateCreator";
import { TemplatesGallery } from "./TemplatesGallery";
import { getMPByConstituency } from "@/lib/parliamentaryContacts";
import { useTemplateSubmission } from "@/hooks/useTemplateSubmission";
import { SignatureCounter } from "./SignatureCounter";
import { CountdownTimer } from "./CountdownTimer";
import { MPLookup } from "./MPLookup";
import { SubmissionVerification } from "./SubmissionVerification";

// Helper component for remote Lottie loading to prevent broken assets
const LottieViewer = ({ path, className, loop = true }: { path: string, className?: string, loop?: boolean }) => {
  const [animationData, setAnimationData] = useState<any>(null);
  
  useEffect(() => {
    fetch(path)
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error(`Lottie load error [${path}]:`, err));
  }, [path]);

  if (!animationData) return null;
  return <Lottie animationData={animationData} loop={loop} className={cn("w-full h-full", className)} />;
};

const SuccessStep = ({ billTitle, onReset }: { billTitle: string; onReset: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center p-6 sm:p-12 space-y-10"
    >
      <div className="relative flex flex-col items-center">
        {/* Animated Environment: Fire Dual-Orchids */}
        <div className="flex items-center justify-center gap-1 sm:gap-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
            <LottieViewer path="/assets/lottie/Fire.json" />
          </div>
          
          {/* CORE SUCCESS LOTTIE */}
          <div className="w-32 h-32 sm:w-48 sm:h-48 relative">
            <LottieViewer path="/assets/lottie/Success.json" loop={false} />
          </div>

          <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
            <LottieViewer path="/assets/lottie/Fire.json" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <h3 className="text-3xl sm:text-5xl font-[1000] tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
            Voice <span className="text-kenya-green">Submitted.</span>
          </h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Your memorandum has been dispatched to Parliament. Your civic action matters — keep the fire burning.
          </p>
        </motion.div>

        {/* Messaging Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="w-full p-5 rounded-3xl bg-kenya-green/5 border border-kenya-green/10 flex items-center gap-4 mt-8"
        >
          <div className="w-10 h-10 flex-shrink-0">
            <LottieViewer path="/assets/lottie/Fire.json" />
          </div>
          <p className="text-[10px] font-black text-kenya-green uppercase tracking-[0.1em] text-left leading-relaxed">
            Don't let the flame die down — share this and keep building pressure on Parliament.
          </p>
        </motion.div>

        {/* Action Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8"
        >
          <button
            onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just formally objected to the ${billTitle} on @CEKAKenya. Your voice matters too — add yours: `)} ${encodeURIComponent(window.location.href)}`, '_blank')}
            className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-black text-white border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all duration-300"
          >
            <TwitterColorIcon size={18} /> Share on X
          </button>
          <button
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`I formally objected to the ${billTitle} on CEKA. Add your voice: ${window.location.href}`)}`, '_blank')}
            className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-[#25D366] text-white border border-[#25D366]/20 text-[10px] font-black uppercase tracking-widest hover:bg-[#20bd5a] transition-all duration-300"
          >
            <Share2Icon size={18} className="text-white" /> Amplify WhatsApp
          </button>
          <button
            onClick={() => window.open('https://civiceducationkenya.com', '_blank')}
            className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-kenya-green text-white border border-kenya-green/20 text-[10px] font-black uppercase tracking-widest hover:bg-[#004d00] transition-all duration-300"
          >
            <MailSendIcon size={18} className="text-white" /> Follow CEKA
          </button>
        </motion.div>
        
        <button 
          onClick={onReset}
          className="mt-10 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-kenya-green transition-colors"
        >
          Submit Another Response
        </button>
      </div>
    </motion.div>
  );
};

// ── Kenya Administrative Units ────────────────────────────────────────────────
const KENYA_COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo Marakwet", "Embu", "Garissa",
  "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi",
  "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos",
  "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a",
  "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu",
  "Siaya", "Taita Taveta", "Tana River", "Tharaka Nithi", "Trans Nzoia", "Turkana",
  "Uasin Gishu", "Vihiga", "Wajir", "West Pokot"
];

const COUNTY_CONSTITUENCIES: Record<string, string[]> = {
  "Baringo": ['Baringo Central', 'Baringo North', 'Baringo South', 'Eldama Ravine', 'Mogotio', 'Tiaty'],
  "Bomet": ['Bomet Central', 'Bomet East', 'Chepalungu', 'Konoin', 'Sotik'],
  "Bungoma": ['Bumula', 'Kabuchai', 'Kanduyi', 'Kimilili', 'Mt. Elgon', 'Sirisia', 'Tongaren', 'Webuye East', 'Webuye West'],
  "Busia": ['Budalangi', 'Butula', 'Funyula', 'Matayos', 'Nambale', 'Teso North', 'Teso South'],
  "Elgeyo Marakwet": ['Keiyo North', 'Keiyo South', 'Marakwet East', 'Marakwet West'],
  "Embu": ['Manyatta', 'Mbeere North', 'Mbeere South', 'Runyenjes'],
  "Garissa": ['Balambala', 'Dadaab', 'Fafi', 'Garissa Township', 'Ijara', 'Lagdera'],
  "Homa Bay": ['Homa Bay Town', 'Kabondo Kasipul', 'Karachuonyo', 'Kasipul', 'Ndhiwa', 'Rangwe', 'Suba North', 'Suba South'],
  "Isiolo": ['Isiolo North', 'Isiolo South'],
  "Kajiado": ['Kajiado Central', 'Kajiado East', 'Kajiado North', 'Kajiado South', 'Kajiado West'],
  "Kakamega": ['Butere', 'Ikolomani', 'Khwisero', 'Likuyani', 'Lugari', 'Lurambi', 'Malava', 'Matungu', 'Mumias East', 'Mumias West', 'Navakholo', 'Shinyalu'],
  "Kericho": ['Ainamoi', 'Belgut', 'Bureti', 'Kipkelion East', 'Kipkelion West', 'Sigowet/Soin'],
  "Kiambu": ['Gatundu North', 'Gatundu South', 'Githunguri', 'Juja', 'Kabete', 'Kiambaa', 'Kiambu', 'Kikuyu', 'Lari', 'Limuru', 'Ruiru', 'Thika Town'],
  "Kilifi": ['Ganze', 'Kaloleni', 'Kilifi North', 'Kilifi South', 'Magarini', 'Malindi', 'Rabai'],
  "Kirinyaga": ['Gichugu', 'Kirinyaga Central', 'Mwea', 'Ndia'],
  "Kisii": ['Bobasi', 'Bomachoge Borabu', 'Bomachoge Chache', 'Bonchari', 'Kitutu Chache North', 'Kitutu Chache South', 'Nyaribari Chache', 'Nyaribari Masaba', 'South Mugirango'],
  "Kisumu": ['Kisumu Central', 'Kisumu East', 'Kisumu West', 'Muhoroni', 'Nyakach', 'Nyando', 'Seme'],
  "Kitui": ['Kitui Central', 'Kitui East', 'Kitui Rural', 'Kitui South', 'Kitui West', 'Mwingi Central', 'Mwingi North', 'Mwingi West'],
  "Kwale": ['Kinango', 'Lungalunga', 'Matuga', 'Msambweni'],
  "Laikipia": ['Laikipia East', 'Laikipia North', 'Laikipia West'],
  "Lamu": ['Lamu East', 'Lamu West'],
  "Machakos": ['Kangundo', 'Kathiani', 'Machakos Town', 'Masinga', 'Matungulu', 'Mavoko', 'Mwala', 'Yatta'],
  "Makueni": ['Kaiti', 'Kibwezi East', 'Kibwezi West', 'Kilome', 'Makueni', 'Mbooni'],
  "Mandera": ['Banissa', 'Lafey', 'Mandera East', 'Mandera North', 'Mandera South', 'Mandera West'],
  "Marsabit": ['Laisamis', 'Moyale', 'North Horr', 'Saku'],
  "Meru": ['Buuri', 'Central Imenti', 'Igembe Central', 'Igembe North', 'Igembe South', 'North Imenti', 'South Imenti', 'Tigania East', 'Tigania West'],
  "Migori": ['Awendo', 'Kuria East', 'Kuria West', 'Nyatike', 'Rongo', 'Suna East', 'Suna West', 'Uriri'],
  "Mombasa": ['Changamwe', 'Jomvu', 'Kisauni', 'Likoni', 'Mvita', 'Nyali'],
  "Murang'a": ['Gatanga', 'Kandara', 'Kangema', 'Kigumo', 'Kiharu', 'Maragwa', 'Mathioya'],
  "Nairobi": ['Dagoretti North', 'Dagoretti South', 'Embakasi Central', 'Embakasi East', 'Embakasi North', 'Embakasi South', 'Embakasi West', 'Kamukunji', 'Kasarani', 'Kibra', 'Langata', 'Makadara', 'Mathare', 'Roysambu', 'Ruaraka', 'Starehe', 'Westlands'],
  "Nakuru": ['Bahati', 'Gilgil', 'Kuresoi North', 'Kuresoi South', 'Molo', 'Naivasha', 'Nakuru Town East', 'Nakuru Town West', 'Njoro', 'Rongai', 'Subukia'],
  "Nandi": ['Aldai', 'Chesumei', 'Emgwen', 'Mosop', 'Nandi Hills', 'Tinderet'],
  "Narok": ['Emurua Dikirr', 'Kilgoris', 'Narok East', 'Narok North', 'Narok South', 'Narok West'],
  "Nyamira": ['Borabu', 'Kitutu Masaba', 'North Mugirango', 'West Mugirango'],
  "Nyandarua": ['Kinangop', 'Kipipiri', 'Ndaragwa', 'Ol Jorok', 'Ol Kalou'],
  "Nyeri": ['Kieni', 'Mathira', 'Mukurweini', 'Nyeri Town', 'Othaya', 'Tetu'],
  "Samburu": ['Samburu East', 'Samburu North', 'Samburu West'],
  "Siaya": ['Alego Usonga', 'Bondo', 'Gem', 'Rarieda', 'Ugenya', 'Ugunja'],
  "Taita Taveta": ['Mwatate', 'Taveta', 'Voi', 'Wundanyi'],
  "Tana River": ['Bura', 'Galole', 'Garsen'],
  "Tharaka Nithi": ["Chuka/Igambang''Ombe", 'Maara', 'Tharaka'],
  "Trans Nzoia": ['Cherangany', 'Endebess', 'Kiminini', 'Kwanza', 'Saboti'],
  "Turkana": ['Loima', 'Turkana Central', 'Turkana East', 'Turkana North', 'Turkana South', 'Turkana West'],
  "Uasin Gishu": ['Ainabkoi', 'Kapseret', 'Kesses', 'Moiben', 'Soy', 'Turbo'],
  "Vihiga": ['Emuhaya', 'Hamisi', 'Luanda', 'Sabatia', 'Vihiga'],
  "Wajir": ['Eldas', 'Tarbaj', 'Wajir East', 'Wajir North', 'Wajir South', 'Wajir West'],
  "West Pokot": ['Kacheliba', 'Kapenguria', 'Pokot South', 'Sigor'],
};

interface LegislativeMemorandumProps {
  billId: string;
  billTitle: string;
  billSummary: string;
  deadline?: string | null;
  signatureGoal?: number;
  constitutionalSection?: string | null;
}

type SuccessState = 'editing' | 'submitted';

export const LegislativeMemorandum: React.FC<LegislativeMemorandumProps> = ({
  billId,
  billTitle,
  billSummary,
  deadline,
  signatureGoal = 1000,
  constitutionalSection
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
  const [customEmails, setCustomEmails] = useState<{ id: number, address: string }[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [memoLoading, setMemoLoading] = useState(false);
  const [memoEnriched, setMemoEnriched] = useState(false);
  const [pursuantArticles, setPursuantArticles] = useState<string>(constitutionalSection || 'Articles 10(2), 118(1)');
  const [hasConsent, setHasConsent] = useState(false);
  const [signatureCount, setSignatureCount] = useState(0);
  const [successState, setSuccessState] = useState<SuccessState>('editing');

  // Location autocomplete state
  const [countySearch, setCountySearch] = useState('');
  const [countyOpen, setCountyOpen] = useState(false);
  const [constituencySearch, setConstituencySearch] = useState('');
  const [constituencyOpen, setConstituencyOpen] = useState(false);
  const countyRef = useRef<HTMLDivElement>(null);
  const constituencyRef = useRef<HTMLDivElement>(null);

  const filteredCounties = KENYA_COUNTIES.filter(c =>
    c.toLowerCase().includes(countySearch.toLowerCase())
  );

  const availableConstituencies = identity.county
    ? (COUNTY_CONSTITUENCIES[identity.county] || [])
    : [];

  const filteredConstituencies = availableConstituencies.filter(c =>
    c.toLowerCase().includes(constituencySearch.toLowerCase())
  );

  // Real-time Constitutional Enrichment for Memoranda
  useEffect(() => {
    const enrichLegalBasis = async () => {
      if (constitutionalSection) {
        setPursuantArticles(constitutionalSection);
        setMemoEnriched(true);
        return;
      }

      try {
        setMemoLoading(true);
        setMemoEnriched(false);
        const { geminiService } = await import('@/services/geminiService');
        const basis = await geminiService.getConstitutionalBasis(billTitle, billSummary);
        if (basis) {
          setPursuantArticles(basis);
          setMemoEnriched(true);
        }
      } catch (err) {
        console.error("[Memorandum] Constitutional enrichment failed:", err);
      } finally {
        setMemoLoading(false);
      }
    };

    enrichLegalBasis();
  }, [billTitle, billSummary, constitutionalSection]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countyRef.current && !countyRef.current.contains(e.target as Node)) setCountyOpen(false);
      if (constituencyRef.current && !constituencyRef.current.contains(e.target as Node)) setConstituencyOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

Pursuant to ${pursuantArticles} of the Constitution 2010 that mandates Public Participation in any Legislative Process I, {{full_name}}, a resident of {{constituency}} Constituency, {{county}} County, wish to submit my Memoranda as follows:

Regarding: ${billTitle}
Context: ${billSummary}

In conclusion, I call for the withdrawal of this Bill as it is made in Bad Faith, ignorant to the Current Economic Needs and Political Wills of the People of Kenya. I thus pray that you Reject it for the sake of a better Kenya.

Yours Faithfully,

{{full_name}}
Date: {{date}}

Citizen of Kenya`;
    setMessageBody(template);
  }, [billTitle, billSummary, pursuantArticles]);

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
    toast({ title: "Template Ready", description: "Using shared memorandum template." });
  };

  const handleInitialSubmit = async () => {
    if (!hasConsent) {
      toast({ title: "Consent Required", description: "Please confirm that you authorize CEKA to submit this on your behalf.", variant: "destructive" });
      return;
    }
    const res = await submitSignature(`Submitted via official email.`);
    if (res) {
      toast({ title: "Almost Done", description: "Sending verification code..." });
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
    setSuccessState('submitted');
  };

  const handleAmplify = () => { amplifyWhatsApp(billTitle); };

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
        <div style="white-space: pre-wrap; font-size: 16px; text-align: justify;">${getProcessedBody()}</div>
        <div style="margin-top: 80px; padding-top: 30px; border-top: 1px solid #ccc; text-align: center;">
          <p style="margin: 0; font-weight: bold;">Digital Signature</p>
          <p style="margin: 5px 0; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">${identity.name}</p>
          <p style="font-size: 10px; color: #888; text-transform: uppercase;">Reference ID: ${submissionId || 'CEKA-ID-' + billId.slice(0, 8)}</p>
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

  // ── Success State ─────────────────────────────────────────────────────────
  if (successState === 'submitted') {
    return (
      <div className="relative p-[1px] rounded-[40px] bg-gradient-to-br from-kenya-green/30 to-kenya-green/5 shadow-ios-high overflow-hidden">
        <div className="bg-white/95 dark:bg-slate-900/80 backdrop-blur-3xl rounded-[39px] overflow-hidden">
          <SuccessStep 
            billTitle={billTitle} 
            onReset={() => setSuccessState('editing')} 
          />
        </div>
      </div>
    );
  }

  // ── Main Form ─────────────────────────────────────────────────────────────
  return (
    <div className="relative group/memorandum">
      <div className="relative p-[1px] rounded-[40px] bg-gradient-to-br from-white/20 to-white/5 dark:from-white/10 dark:to-transparent shadow-ios-high overflow-hidden">
        <div className="bg-white/90 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[39px] overflow-hidden">

          {/* Status Header */}
          <div className="px-5 sm:px-8 py-4 sm:py-5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5 border-b border-black/5 dark:border-white/5 gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-4 w-4 rounded-full bg-kenya-green shadow-[0_0_10px_rgba(0,186,0,0.3)] flex-shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 truncate">Process Active</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <SignatureCounter current={signatureCount} goal={signatureGoal} variant="compact" className="w-[90px]" />
              <div className="h-4 w-[1px] bg-black/5 dark:bg-white/5" />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsGalleryOpen(true)}
                  title="Templates by CEKA Community"
                  className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-slate-400 hover:text-kenya-green"
                >
                  <LibraryIcon size={16} />
                </button>
                <button
                  onClick={() => setIsCreatorOpen(true)}
                  title="Template Creator"
                  className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-slate-400 hover:text-kenya-green"
                >
                  <PenNewSquareIcon size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8 space-y-8 sm:space-y-10">
            {/* Deadline Timer */}
            <CountdownTimer deadline={deadline} />

            {/* ── Your Details ── */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-3">
                <DetailsIcon size={16} className="text-kenya-green flex-shrink-0" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Your Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Full Name */}
                <div className="group/input relative">
                  <Input
                    value={identity.name}
                    onChange={(e) => updateIdentity({ name: e.target.value })}
                    placeholder="Enter Name"
                    className="h-14 pl-12 rounded-2xl border-none bg-slate-50 dark:bg-white/5 focus:bg-white dark:focus:bg-white/10 transition-all font-bold text-sm shadow-inner"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-kenya-green transition-colors">
                    <DetailsIcon size={14} />
                  </div>
                </div>

                {/* Email */}
                <div className="group/input relative">
                  <Input
                    value={identity.email}
                    onChange={(e) => updateIdentity({ email: e.target.value })}
                    placeholder="your@email.com"
                    className="h-14 pl-12 rounded-2xl border-none bg-slate-50 dark:bg-white/5 focus:bg-white dark:focus:bg-white/10 transition-all font-bold text-sm shadow-inner"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-kenya-green transition-colors">
                    <MailOpenAltIcon size={14} />
                  </div>
                </div>

                {/* County autocomplete */}
                <div ref={countyRef} className="relative">
                  <div className="group/input relative">
                    <Input
                      value={countySearch || identity.county}
                      onChange={(e) => {
                        setCountySearch(e.target.value);
                        updateIdentity({ county: e.target.value, constituency: '' });
                        setConstituencySearch('');
                        setCountyOpen(true);
                      }}
                      onFocus={() => { setCountySearch(''); setCountyOpen(true); }}
                      placeholder="Select County"
                      className="h-14 pl-12 pr-8 rounded-2xl border-none bg-slate-50 dark:bg-white/5 focus:bg-white dark:focus:bg-white/10 transition-all font-bold text-sm shadow-inner"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-kenya-green transition-colors">
                      <LocationIcon size={14} />
                    </div>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs pointer-events-none">▾</span>
                  </div>
                  <AnimatePresence>
                    {countyOpen && filteredCounties.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 rounded-2xl shadow-ios-high border border-black/5 dark:border-white/10 max-h-48 overflow-y-auto green-scrollbar"
                      >
                        {filteredCounties.map(county => (
                          <button
                            key={county}
                            type="button"
                            onMouseDown={() => {
                              updateIdentity({ county, constituency: '' });
                              setCountySearch('');
                              setConstituencySearch('');
                              setCountyOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2.5 text-sm font-bold transition-colors",
                              identity.county === county
                                ? "text-kenya-green bg-kenya-green/5"
                                : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                            )}
                          >
                            {county}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Constituency autocomplete */}
                <div ref={constituencyRef} className="relative">
                  <div className="group/input relative">
                    <Input
                      value={constituencySearch || identity.constituency}
                      onChange={(e) => {
                        setConstituencySearch(e.target.value);
                        updateIdentity({ constituency: e.target.value });
                        setConstituencyOpen(true);
                      }}
                      onFocus={() => { setConstituencySearch(''); setConstituencyOpen(true); }}
                      placeholder={identity.county ? `Constituency in ${identity.county}` : "Select Constituency"}
                      className="h-14 pl-12 pr-8 rounded-2xl border-none bg-slate-50 dark:bg-white/5 focus:bg-white dark:focus:bg-white/10 transition-all font-bold text-sm shadow-inner"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-kenya-green transition-colors">
                      <KeyIcon size={14} />
                    </div>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs pointer-events-none">▾</span>
                  </div>
                  <AnimatePresence>
                    {constituencyOpen && filteredConstituencies.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 rounded-2xl shadow-ios-high border border-black/5 dark:border-white/10 max-h-48 overflow-y-auto green-scrollbar"
                      >
                        {filteredConstituencies.map(con => (
                          <button
                            key={con}
                            type="button"
                            onMouseDown={() => {
                              updateIdentity({ constituency: con });
                              setConstituencySearch('');
                              setConstituencyOpen(false);
                              if (!identity.county) {
                                const matchingCounty = Object.entries(COUNTY_CONSTITUENCIES).find(
                                  ([, cons]) => cons.includes(con)
                                )?.[0];
                                if (matchingCounty) updateIdentity({ constituency: con, county: matchingCounty });
                              }
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2.5 text-sm font-bold transition-colors",
                              identity.constituency === con
                                ? "text-kenya-green bg-kenya-green/5"
                                : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                            )}
                          >
                            {con}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* ── Recipients ── */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                  <KeyIcon size={16} className="text-kenya-green flex-shrink-0" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Recipients</h3>
                </div>
                <button
                  onClick={() => setIsAddingEmail(true)}
                  className="text-[10px] font-black text-kenya-green uppercase tracking-widest flex items-center gap-1.5 hover:underline flex-shrink-0"
                >
                  <AddRowIcon size={12} /> Add Recipient
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
                      "flex items-center justify-between p-4 rounded-2xl transition-all duration-300 cursor-pointer border",
                      selectedRecipients[target.id as keyof typeof selectedRecipients]
                        ? "bg-kenya-green/10 border-kenya-green/20"
                        : "bg-slate-50 dark:bg-white/5 border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
                        selectedRecipients[target.id as keyof typeof selectedRecipients] ? "bg-kenya-green text-white shadow-lg" : "bg-slate-200 dark:bg-white/10 text-slate-400"
                      )}>
                        <CommentsIcon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black tracking-tight truncate">{target.label}</p>
                        <p className="text-[10px] font-medium text-slate-400 truncate">{target.email}</p>
                      </div>
                    </div>
                    <Checkbox checked={selectedRecipients[target.id as keyof typeof selectedRecipients]} className="rounded-full border-slate-300 dark:border-white/20 flex-shrink-0" />
                  </div>
                ))}

                <MPLookup
                  constituency={identity.constituency}
                  isSelected={selectedRecipients.localMP}
                  onSelect={(checked) => handleRecipientChange('localMP', checked)}
                />

                {customEmails.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-4 rounded-2xl bg-kenya-green/5 border border-kenya-green/10 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-kenya-green text-white flex items-center justify-center flex-shrink-0">
                        <MailOpenAltIcon size={18} />
                      </div>
                      <p className="text-xs font-black truncate">{e.address}</p>
                    </div>
                    <button
                      onClick={() => setCustomEmails(customEmails.filter(x => x.id !== e.id))}
                      className="text-slate-400 hover:text-kenya-red transition-colors flex-shrink-0"
                    >
                      <RemoveRowIcon size={16} />
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
                      className="border-none bg-transparent font-bold text-sm"
                    />
                    <Button onClick={addRecipient} className="bg-kenya-green rounded-xl h-10 px-4 font-black text-[10px] uppercase flex-shrink-0">Add</Button>
                    <button onClick={() => setIsAddingEmail(false)} className="p-2 text-slate-400">
                      <CloseIcon size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Memorandum Content ── */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                  <MailOpenAltIcon size={16} className="text-kenya-green flex-shrink-0" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Memorandum Content</h3>
                </div>
                <div className="flex items-center gap-2">
                  <AnimatePresence mode="wait">
                    {memoLoading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-slate-400"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <IOSLoadingIcon size={16} />
                        </motion.div>
                      </motion.div>
                    ) : memoEnriched ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-kenya-green"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: [0, 1.4, 1] }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        >
                          <IOSTickIcon size={16} />
                        </motion.div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-kenya-green/10 text-kenya-green text-[9px] font-black uppercase tracking-widest flex-shrink-0">
                    <StarIcon size={10} /> Auto-Fill Active
                  </div>
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
                    className="min-h-[220px] sm:min-h-[260px] rounded-[28px] sm:rounded-[32px] border-none bg-slate-50 dark:bg-white/5 text-sm sm:text-base leading-relaxed p-5 sm:p-8 green-scrollbar font-serif text-slate-600 dark:text-slate-300 shadow-inner"
                  />
                  <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
                    <BankIcon size={60} />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border-black/5 dark:border-white/5">
                  <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Edit Template</p>
                  <Textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    className="min-h-[120px] bg-transparent border-none text-base sm:text-xl leading-relaxed p-0 green-scrollbar opacity-60 focus:opacity-100 transition-opacity"
                  />
                </div>
              </div>
            </div>

            {/* ── Consent & Submission ── */}
            <div className="space-y-5 sm:space-y-8">
              <div
                className="p-5 sm:p-6 rounded-[28px] sm:rounded-[32px] bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center gap-4 sm:gap-6 cursor-pointer"
                onClick={() => setHasConsent(!hasConsent)}
              >
                <Checkbox
                  checked={hasConsent}
                  onCheckedChange={(checked) => setHasConsent(checked as boolean)}
                  className="h-8 w-8 rounded-xl border-slate-300 dark:border-white/20 data-[state=checked]:bg-kenya-green data-[state=checked]:border-kenya-green transition-all flex-shrink-0"
                />
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-snug">
                    I authorize CEKA to submit this response on my behalf. I confirm that the details provided are accurate.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleInitialSubmit}
                    disabled={isSubmitting}
                    className="flex-[2] h-14 sm:h-16 rounded-2xl bg-gradient-to-br from-kenya-green to-[#004d00] text-white font-black text-xs sm:text-sm uppercase tracking-widest hover:scale-[1.01] hover:shadow-2xl active:scale-[0.99] transition-all duration-300 shadow-xl shadow-kenya-green/40 gap-3 group"
                  >
                    <Send2Icon size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                    Sign &amp; Submit
                  </Button>

                  <Button
                    onClick={handleAmplify}
                    className="flex-1 h-14 sm:h-16 rounded-2xl bg-[#076b11] hover:bg-[#0a9418] text-white font-black text-xs sm:text-sm uppercase tracking-widest gap-2 shadow-xl shadow-[#075E54]/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.98]"
                  >
                    <Share2Icon size={18} />
                    Share
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleSavePDF}
                    className="flex items-center justify-center h-12 rounded-2xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-kenya-green hover:border-kenya-green/20 transition-all duration-300 gap-2"
                  >
                    <SaveAddIcon size={14} /> Save as PDF
                  </button>
                  <button
                    onClick={() => {
                      const text = `I just formally objected to ${billTitle} on CEKA. Support the cause: `;
                      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
                    }}
                    className="flex items-center justify-center h-12 rounded-2xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-[#00AAEC] hover:border-[#00AAEC]/20 transition-all duration-300 gap-2"
                  >
                    <TwitterColorIcon size={14} /> Share on X
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-5 sm:pt-6 border-t border-black/5 dark:border-white/5 flex items-center justify-between opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
              <p className="text-[9px] font-black uppercase tracking-widest">Contact at tech@civiceducationkenya.com for queries</p>
              <div className="flex gap-3 sm:gap-4">
                <SecureShieldIcon size={13} />
                <SecurePCIcon size={13} />
                <MailSendIcon size={13} />
              </div>
            </div>
          </div>
        </div>
      </div>

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
          onResend={() => { }}
          onCancel={() => { }}
        />
      )}

      <TemplatesGallery isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} onSelectTemplate={handleSelectTemplate} />
      <TemplateCreator isOpen={isCreatorOpen} onClose={() => setIsCreatorOpen(false)} initialData={{ title: billTitle, body: messageBody, subject: subject, billId: billId }} />
    </div>
  );
};
