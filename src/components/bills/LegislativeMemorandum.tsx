import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from "lottie-react";
import {
  BankIcon, CommentsIcon, LocationIcon, KeyIcon,
  SearchIcon, StarIcon, CloseIcon, IOSLoadingIcon, IOSTickIcon
} from "../ui/CustomIcons";
import {
  DetailsIcon, LibraryIcon, PenNewSquareIcon, AddRowIcon, RemoveRowIcon,
  MailOpenAltIcon, Send2Icon, Share2Icon, SaveAddIcon,
  TwitterColorIcon, SecureShieldIcon, SecurePCIcon, MailSendIcon, XCircleIcon,
  CancelCloseIcon, HourglassIcon, PreciseTickIcon, MailBulkIcon
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
import { FINANCE_BILL_2026_CLAUSES } from '@/data/financeBill2026';

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

const EmailOpenIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12.55,14.63,19.45,10a1,1,0,0,1,1.55.83V20a1,1,0,0,1-1,1H4a1,1,0,0,1-1-1V10.87A1,1,0,0,1,4.55,10l6.9,4.59A1,1,0,0,0,12.55,14.63Z" fill="currentColor" opacity="0.8" />
    <path d="M6,11V3H18v8l-5.45,3.63a1,1,0,0,1-1.1,0Zm5.45,3.63L4.55,10A1,1,0,0,0,3,10.87V20a1,1,0,0,0,1,1H20a1,1,0,0,0,1-1V10.87A1,1,0,0,0,19.45,10l-6.9,4.59A1,1,0,0,1,11.45,14.63Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EmailAltIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="0" fill="none" width="20" height="20" />
    <g>
      <path d="M16 1.1L4 5.9c-1.1.4-2 1.8-2 3v8.7c0 1.2.9 1.8 2 1.4l12-4.8c1.1-.4 2-1.8 2-3V2.5c0-1.2-.9-1.8-2-1.4zm.6 2.6l-6 9.3-6.7-4.5c-.1-.1-.4-.4-.2-.7.2-.4.7-.2.7-.2l6.3 2.3s4.8-6.3 5.1-6.7c.1-.2.4-.3.7-.1.3.2.2.5.1.6z" fill="currentColor" />
    </g>
  </svg>
);

const WriteIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M19.186 2.09c.521.25 1.136.612 1.625 1.101.49.49.852 1.104 1.1 1.625.313.654.11 1.408-.401 1.92l-7.214 7.213c-.31.31-.688.541-1.105.675l-4.222 1.353a.75.75 0 0 1-.943-.944l1.353-4.221a2.75 2.75 0 0 1 .674-1.105l7.214-7.214c.512-.512 1.266-.714 1.92-.402zm.211 2.516a3.608 3.608 0 0 0-.828-.586l-6.994 6.994a1.002 1.002 0 0 0-.178.241L9.9 14.102l2.846-1.496c.09-.047.171-.107.242-.178l6.994-6.994a3.61 3.61 0 0 0-.586-.828zM4.999 5.5A.5.5 0 0 1 5.47 5l5.53.005a1 1 0 0 0 0-2L5.5 3A2.5 2.5 0 0 0 3 5.5v12.577c0 .76.082 1.185.319 1.627.224.419.558.754.977.978.442.236.866.318 1.627.318h12.154c.76 0 1.185-.082 1.627-.318.42-.224.754-.559.978-.978.236-.442.318-.866.318-1.627V13a1 1 0 1 0-2 0v5.077c0 .459-.021.571-.082.684a.364.364 0 0 1-.157.157c-.113.06-.225.082-.684.082H5.923c-.459 0-.57-.022-.684-.082a.363.363 0 0 1-.157-.157c-.06-.113-.082-.225-.082-.684V5.5z" fill="currentColor" />
  </svg>
);

const PositionManIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M63.848 73.354l-1.383 1.71c1.87.226 3.68.491 5.375.812l-5.479 1.623l7.313 1.945l5.451-1.719c3.348 1.123 7.984 2.496 9.52 4.057h-10.93l1.086 3.176h11.342c-.034 1.79-3.234 3.244-6.29 4.422l-7.751-1.676l-7.303 2.617l7.8 1.78c-4.554 1.24-12.2 1.994-18.53 2.341l-.266-3.64h-7.606l-.267 3.64c-6.33-.347-13.975-1.1-18.53-2.34l7.801-1.781l-7.303-2.617l-7.752 1.676c-3.012-.915-6.255-2.632-6.289-4.422H25.2l1.086-3.176h-10.93c1.536-1.561 6.172-2.934 9.52-4.057l5.451 1.719l7.313-1.945l-5.479-1.623a82.552 82.552 0 0 1 5.336-.807l-1.363-1.713c-14.785 1.537-27.073 4.81-30.295 9.979C.7 91.573 19.658 99.86 49.37 99.989c.442.022.878.006 1.29 0c29.695-.136 48.636-8.42 43.501-16.654c-3.224-5.171-15.52-8.445-30.314-9.981z" fill="currentColor"></path><path d="M49.855 0A10.5 10.5 0 0 0 39.5 10.5A10.5 10.5 0 0 0 50 21a10.5 10.5 0 0 0 10.5-10.5A10.5 10.5 0 0 0 50 0a10.5 10.5 0 0 0-.145 0zm-.057 23.592c-7.834.002-15.596 3.368-14.78 10.096l2 14.625c.351 2.573 2.09 6.687 4.687 6.687h.185l2.127 24.531c.092 1.105.892 2 2 2h8c1.108 0 1.908-.895 2-2l2.127-24.53h.186c2.597 0 4.335-4.115 4.687-6.688l2-14.625c.524-6.734-7.384-10.097-15.219-10.096z" fill="currentColor"></path>
  </svg>
);

const AddProfileIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M2,21h8a1,1,0,0,0,0-2H3.071A7.011,7.011,0,0,1,10,13a5.044,5.044,0,1,0-3.377-1.337A9.01,9.01,0,0,0,1,20,1,1,0,0,0,2,21ZM10,5A3,3,0,1,1,7,8,3,3,0,0,1,10,5ZM23,16a1,1,0,0,1-1,1H19v3a1,1,0,0,1-2,0V17H14a1,1,0,0,1,0-2h3V12a1,1,0,0,1,2,0v3h3A1,1,0,0,1,23,16Z" fill="currentColor" />
  </svg>
);

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
            Email <span className="text-kenya-green">Submitted.</span>
          </h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Your email has been sent to Parliament. Great job - but the fire must keep burning.
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
            Feeling excited? You deserve it anyway - now help us share this to keep the fire burning & make our voices heart.
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
            onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just formally objected to the ${billTitle} on @CEKAKenya. Your voice matters too - add yours: `)} ${encodeURIComponent(window.location.href)}`, '_blank')}
            className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-black text-white border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all duration-300"
          >
            <TwitterColorIcon size={18} /> Share on X
          </button>
          <button
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`I formally objected to the ${billTitle} on CEKA. Add your voice: ${window.location.href}`)}`, '_blank')}
            className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-[#25D366] text-white border border-[#25D366]/20 text-[10px] font-black uppercase tracking-widest hover:bg-[#20bd5a] transition-all duration-300"
          >
            <Share2Icon size={18} className="text-white" /> Share on WhatsApp
          </button>
          <button
            onClick={() => window.open('https://civiceducationkenya.com', '_blank')}
            className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-kenya-green text-white border border-kenya-green/20 text-[10px] font-black uppercase tracking-widest hover:bg-[#004d00] transition-all duration-300"
          >
            <MailSendIcon size={18} className="text-white" /> Join the CEKA Community
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

// ── Template taxonomy ─────────────────────────────────────────────────────────
const CATEGORY_COMMITTEE: Record<string, string> = {
  'Finance': 'Finance and National Planning Committee',
  'Finance & Taxation': 'Finance and National Planning Committee',
  'Health': 'Health Committee',
  'Law & Criminal Justice': 'Justice and Legal Affairs Committee',
  'Governance': 'Justice, Legal Affairs and Human Rights Committee',
  'Environment': 'Environment and Natural Resources Committee',
  'Education': 'Education and Research Committee',
  'Agriculture': 'Agriculture and Livestock Committee',
  'Devolution & Counties': 'Devolution and Intergovernmental Relations Committee',
  'Infrastructure': 'Transport, Public Works and Housing Committee',
  'Social Affairs': 'Labour and Social Welfare Committee',
  'Defence & Security': 'Administration and National Security Committee',
  'Constitutional': 'Constitution Implementation Oversight Committee',
};

const VARIANT_META = [
  { id: 'A', label: 'Full', desc: 'Comprehensive: all constitutional anchors, policy implications, full record' },
  { id: 'B', label: 'Simple', desc: 'Plain-language: clear, personal, accessible to every Kenyan' },
  { id: 'C', label: 'Technical', desc: 'Discipline-aware: law, finance, health or governance context' },
  { id: 'D', label: 'Activist Special', desc: 'Short, sharp, bilingual: zero diplomatic cushioning' },
  { id: 'E', label: 'Lugha ya Taifa (Swahili)', desc: 'Maelezo kamili kwa Kiswahili: inalinda haki zako kikatiba' },
  { id: 'F', label: 'See More Templates', desc: 'Browse the community gallery for custom-built templates' },
] as const;

type VariantId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
type PositionId = 'OPPOSE' | 'SUPPORT' | 'AMEND';

const POSITION_META: { id: PositionId; label: string; color: string }[] = [
  { id: 'OPPOSE', label: 'Oppose', color: 'bg-kenya-red/10 border-kenya-red/20 text-kenya-red' },
  { id: 'SUPPORT', label: 'Support', color: 'bg-kenya-green/10 border-kenya-green/20 text-kenya-green' },
  { id: 'AMEND', label: 'Support with Amendments', color: 'bg-amber-500/10 border-amber-500/20 text-amber-600' },
];

interface LegislativeMemorandumProps {
  billId: string;
  billTitle: string;
  billSummary: string;
  deadline?: string | null;
  signatureGoal?: number;
  constitutionalSection?: string | null;
  // Extended bill context for template engine
  billNo?: string | null;
  billHouse?: string | null;
  billSessionYear?: number | null;
  billCategory?: string | null;
  billSponsor?: string | null;
  billStatus?: string | null;
  billNeuralSummary?: string | null;
  billTabloidSummary?: string | null;
  billAiConcerns?: string[] | null;
  billCurrentStage?: string | null;
}

type SuccessState = 'editing' | 'submitted';

export const LegislativeMemorandum: React.FC<LegislativeMemorandumProps> = ({
  billId,
  billTitle,
  billSummary,
  deadline,
  signatureGoal = 1000,
  constitutionalSection,
  billNo,
  billHouse,
  billSessionYear,
  billCategory,
  billSponsor,
  billStatus,
  billNeuralSummary,
  billTabloidSummary,
  billAiConcerns,
  billCurrentStage,
}) => {
  const {
    identity,
    updateIdentity,
    submitSignature,
    verifyOTP,
    amplifyWhatsApp,
    isSubmitting,
    needsVerification,
    setNeedsVerification,
    submissionId
  } = useTemplateSubmission(billId, null);

  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<VariantId>('A');
  const [userPosition, setUserPosition] = useState<PositionId>('OPPOSE');
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
  const [isPetitionStyleOpen, setIsPetitionStyleOpen] = useState(false);
  const [selectedFinanceClauses, setSelectedFinanceClauses] = useState<Map<string, PositionId>>(new Map());
  const [clauseAmendments, setClauseAmendments] = useState<Map<string, string>>(new Map());
  const [expandedAMENDId, setExpandedAMENDId] = useState<string | null>(null);
  const isFinanceBill = (billTitle.toLowerCase().includes('finance') && (billTitle.includes('2024') || billTitle.includes('2025') || billTitle.includes('2026'))) ||
    billNo?.toLowerCase().includes('finance') ||
    billTitle.toLowerCase().includes('Petition');

  // Trigger bulk selection: when overall userPosition changes, FORCE all technical clauses to it
  useEffect(() => {
    if (isFinanceBill) {
      const nextMap = new Map();
      FINANCE_BILL_2026_CLAUSES.forEach(c => {
        nextMap.set(c.id, userPosition);
      });
      setSelectedFinanceClauses(nextMap);
      // Close all amendment inputs on bulk change to avoid layout explosion
      setExpandedAMENDId(null);
    }
  }, [userPosition]);

  const setFinanceClausePosition = (id: string, position: PositionId) => {
    const nextMap = new Map(selectedFinanceClauses);
    if (nextMap.get(id) === position) {
      nextMap.delete(id); // Toggle off if same clicked
      if (position === 'AMEND') setExpandedAMENDId(null);
    } else {
      nextMap.set(id, position);
      // Only expand the amendment input if clicking the individual Amend button
      if (position === 'AMEND') {
        setExpandedAMENDId(id);
      } else {
        setExpandedAMENDId(null);
      }
    }
    setSelectedFinanceClauses(nextMap);
  };

  const updateClauseAmendment = (id: string, text: string) => {
    const nextMap = new Map(clauseAmendments);
    nextMap.set(id, text);
    setClauseAmendments(nextMap);
  };

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

  // ── Template derived values ──────────────────────────────────────────────
  const todayLong = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const firstName = identity.name ? identity.name.split(' ')[0] : '[FIRST NAME]';
  const lastName = identity.name ? identity.name.split(' ').slice(1).join(' ') || '' : '[LAST NAME]';
  const uConstituency = identity.constituency || '[CONSTITUENCY]';
  const uCounty = identity.county || '[COUNTY]';

  const committeeLabel = billCategory
    ? (CATEGORY_COMMITTEE[billCategory] || 'Relevant Departmental Committee')
    : 'Relevant Departmental Committee';
  const houseLabel = billHouse || 'National Assembly';
  const isNASenate = (billHouse || '').toLowerCase().includes('senate');
  const topRecipient = isNASenate
    ? `Clerk of the Senate`
    : `Clerk of the National Assembly`;

  let parsedConcerns: string[] = [];
  if (Array.isArray(billAiConcerns)) {
    parsedConcerns = billAiConcerns;
  } else if (typeof billAiConcerns === 'string') {
    try {
      const p = JSON.parse(billAiConcerns);
      parsedConcerns = Array.isArray(p) ? p : [billAiConcerns];
    } catch {
      parsedConcerns = [billAiConcerns];
    }
  }

  const concernsBlock = parsedConcerns.length > 0
    ? parsedConcerns.map((c: string) => `  - ${c}`).join('\n')
    : '  [No citizen concerns on record yet]';

  const constitutionalAnchorsBlock = pursuantArticles || 'Articles 10(2), 118(1) of the Constitution of Kenya 2010';

  const actionVerb = userPosition === 'AMEND' ? 'PROPOSE AMENDMENTS TO' : userPosition;
  const outcomeVerb = userPosition === 'OPPOSE' ? 'Rejects' : userPosition === 'SUPPORT' ? 'Passes' : 'Amends';

  const buildVariantA = (): string => `${topRecipient}
Parliament of Kenya
Parliament Road, Nairobi

${todayLong}

RE: PUBLIC MEMORANDUM ON ${billTitle.toUpperCase()} ${billNo ? '(BILL NO. ' + billNo + ')' : ''}

1. IDENTIFICATION & JURISDICTION
I, ${firstName} ${lastName}, a resident of ${uConstituency} Constituency, ${uCounty} County, and a citizen of the Republic of Kenya, submit this memorandum in exercise of my right to public participation under Articles 1(1), 10(2)(a), and 118(1)(b) of the Constitution of Kenya.

2. PETITIONER'S POSITION
Having reviewed the contents of the Bill, I formally ${actionVerb} the ${billTitle}.

3. GROUNDS FOR POSITION
My position is informed by a comprehensive review of the legislative proposals and their anticipated impact on the socio-economic welfare of the people of Kenya. I find the current draft requires significant reconsideration to align with the principles of social justice, transparency, and economic sustainability. My specific technical objections are detailed in the subsequent sections of this submission.

4. PRAYER
Therefore, I respectfully pray that the Committee:
1. Acknowledges receipt of this citizen submission.
2. Formally factors this position during the Committee's reading and report making.
3. Ultimately ${outcomeVerb} the Bill in accordance with the will of the people.

Respectfully submitted,
${firstName} ${lastName}
Citizen of the Republic of Kenya`;

  const buildVariantB = (): string => `${topRecipient}
Parliament of Kenya

${todayLong}

RE: PUBLIC MEMORANDUM ON ${billTitle.toUpperCase()} ${billNo ? '(BILL NO. ' + billNo + ')' : ''}

1. IDENTIFICATION
My name is ${firstName} ${lastName}, and I live in ${uConstituency}, ${uCounty} County. I am submitting this memorandum under Article 118 of the Constitution, which gives me the right to participate in decisions that affect my life.

2. MY POSITION
After reviewing the Bill, I officially ${actionVerb} the ${billTitle}.

3. WHY IT MATTERS TO ME
As a citizen, I am concerned that the current legislative direction does not sufficiently protect the vulnerable members of our society. I believe in a Kenya where every law serves the common good, and I wish to place on record my specific concerns regarding the clauses I have flagged in this PETITION.

4. PRAYER
I am asking this Committee to:
1. Record my views as part of the public participation process.
2. Take my position seriously when writing the final report.
3. ${outcomeVerb === 'Rejects' ? 'Reject' : outcomeVerb === 'Passes' ? 'Pass' : 'Amend'} the Bill as I and other citizens have requested.

Yours faithfully,
${firstName} ${lastName}`;

  const buildVariantC = (): string => `${topRecipient}
Parliament of Kenya
Parliament Road, Nairobi

${todayLong}

RE: TECHNICAL MEMORANDUM ON ${billTitle.toUpperCase()} ${billNo ? '(BILL NO. ' + billNo + ')' : ''}

1. JURISDICTION AND LOCUS STANDI
I, ${firstName} ${lastName}, of ${uConstituency} Constituency, ${uCounty} County, submit this technical memorandum under the framework of Articles 10(2)(a), 118(1)(b) and 119 of the Constitution of Kenya 2010.

2. PETITIONER'S POSITION
A technical review of the legislative proposals indicates that the Bill requires action. I formally ${actionVerb} the ${billTitle}.

3. TECHNICAL GROUNDS FOR POSITION
The technical inadequacies identified in the proposed legislation pertain to its conflict with existing fiscal policies and its potential to disrupt market stability. I have highlighted the specific clauses that require immediate redrafting or total deletion to avoid catastrophic regulatory friction.

4. PRAYER
This memorandum prays that the Committee:
1. Receives and records this technical memorandum as part of the public participation record.
2. Addresses the technical constraints raised herein within the Committee Report.
3. Consequently ${outcomeVerb} the Bill.

Signed,
${firstName} ${lastName}`;

  const buildVariantD = (): string => `${topRecipient}
Parliament of Kenya

${todayLong}

RE: PUBLIC MEMORANDUM ON ${billTitle.toUpperCase()} ${billNo ? '(BILL NO. ' + billNo + ')' : ''}

1. IDENTIFICATION & JURISDICTION
I am ${firstName} ${lastName}, of ${uConstituency}, ${uCounty}. I write under my constitutional right to be heard (Article 118), and I intend to be.

2. MY POSITION
My stance is uncompromising: I ${userPosition === 'AMEND' ? 'DEMAND AMENDMENTS TO' : userPosition} the ${billTitle}.

3. GROUNDS FOR MY DEMAND
The people of Kenya are currently over-burdened by over-taxation and regulatory overreach. I am submitting this PETITION to demand that our representatives prioritize the welfare of ordinary citizens over bureaucratic convenience. The grounds for my demand are explicitly tied to the clauses I have marked for rejection in this memorandum.

4. PRAYER
You are our representatives, and we are watching. I demand that the Committee:
1. Count this submission as formal public participation.
2. Address these demands transparently in the Committee Report.
3. ${outcomeVerb === 'Rejects' ? 'Reject' : outcomeVerb === 'Passes' ? 'Approve' : 'Amend'} the Bill, acting in the interest of the people, not yourselves.

${firstName} ${lastName}
Mwananchi wa Jamhuri ya Kenya`;

  const buildVariantE = (): string => {
    const swahiliAction = userPosition === 'OPPOSE' ? 'NAUPINGA' : userPosition === 'SUPPORT' ? 'NAUUNGA MKONO' : 'NAPENDEKEZA MAREKEBISHO KWA';
    const swahiliOutcome = userPosition === 'OPPOSE' ? 'Iutupe' : userPosition === 'SUPPORT' ? 'Iupitishe' : 'Iufanyie marekebisho';
    return `${topRecipient}
Bunge la Kenya
Barabara ya Bunge, Nairobi

${todayLong}

KUHUSU: MAONI YANGU JUU YA MSWADA WA ${billTitle.toUpperCase()} ${billNo ? '(NAMBARI YA MSWADA ' + billNo + ')' : ''}

1. UTAMBULISHO NA MAMLAKA 
Mimi ni ${firstName} ${lastName}, mkaazi wa Eneo Bunge la ${uConstituency}, Kaunti ya ${uCounty}. Ninawasilisha maoni haya kwa kuzingatia haki yangu ya kikatiba ya ushiriki wa umma chini ya Vifungu 1(1), 10(2)(a), na 118(1)(b) vya Katiba ya Kenya.

2. MSIMAMO WANGU
Baada ya kusoma na kuelewa Mswada huu, mimi rasmi ${swahiliAction} Mswada wa ${billTitle}.

3. SABABU ZA MSIMAMO WANGU
Msimamo wangu umetokana na hofu yangu kwa mustakabali wa uchumi wa nchi yetu na maisha ya mwananchi wa kawaida. Napendekeza bunge lizingatie vilio vya wananchi na kurekebisha vipengele vilivyotajwa hapa chini ili kuhakikisha haki na usawa kwa Wakenya wote.

4. OMBI LANGU KWA KAMATI
Kwa hivyo, ninaomba Kamati hii kwa heshima:
1. Inakili maoni haya kama sehemu rasmi ya ushiriki wa umma.
2. Izingatie msimamo huu kikamilifu wakati wa kuandaa Ripoti ya Kamati.
3. Hatimaye ${swahiliOutcome} Mswada huu kulingana na matakwa ya wananchi.

Wako mwaminifu,
${firstName} ${lastName}
Mwananchi wa Jamhuri ya Kenya`;
  };

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

  // Regenerate template text whenever variant, position, identity, or bill data changes
  useEffect(() => {
    setSubject(`RE: MEMORANDUM ON ${billTitle.toUpperCase()}${billNo ? ' — ' + billNo : ''}`);
    let body = '';
    if (selectedVariant === 'A') body = buildVariantA();
    else if (selectedVariant === 'B') body = buildVariantB();
    else if (selectedVariant === 'C') body = buildVariantC();
    else if (selectedVariant === 'D') body = buildVariantD();
    else body = buildVariantE();
    setMessageBody(body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedVariant, userPosition, pursuantArticles,
    identity.name, identity.constituency, identity.county,
    billTitle, billSummary, billNeuralSummary, billTabloidSummary,
    billAiConcerns, billNo, billHouse, billSessionYear,
    billCategory, billSponsor, billStatus, billCurrentStage,
    selectedFinanceClauses,
  ]);

  // Combined body with technical modules if finance bill
  const getProcessedBody = () => {
    const isFB = isFinanceBill;
    if (!isFB || selectedFinanceClauses.size === 0) return messageBody;

    const technicalList = FINANCE_BILL_2026_CLAUSES.filter(c => selectedFinanceClauses.has(c.id));
    const connectors = ["Also,", "Moreover,", "Additionally,", "Furthermore,", "Crucially,", "Beyond this,", "In addition,"];
    let technicalBlock = "\n\nDETAILED TECHNICAL ANALYSIS BY CLAUSE:\n";

    technicalList.forEach((c, i) => {
      const pos = selectedFinanceClauses.get(c.id) || userPosition;
      const posText = pos === 'OPPOSE' ? "STRONGLY OPPOSE" : pos === 'SUPPORT' ? "FORMALLY SUPPORT" : "PROPOSE AMENDMENT TO";

      const conn = i === 0 ? "To begin with my technical objections," : connectors[i % connectors.length];

      const customAmendment = clauseAmendments.get(c.id);
      const justification = pos === 'AMEND'
        ? (customAmendment ? `Proposed Amendment: ${customAmendment}` : "While the intent is understood, a strategic amendment is required to mitigate unintended secondary impacts.")
        : pos === 'SUPPORT'
          ? "The legislative intent is sound and aligns with progressive policy goals."
          : "The proposed measure introduces significant friction and requires total reconsideration.";

      technicalBlock += `${conn} regarding ${c.clauseId} (${c.title}):\n- Position: ${posText}\n- Ground: ${c.concern}\n- Technical Note: ${justification}\n\n`;
    });

    if (selectedFinanceClauses.has('unconstitutional-assembly-violation')) {
      technicalBlock += "\nFINAL CONSTITUTIONAL BOMBSHELL:\nI further raise that this National Assembly is unconstitutionally constituted under Articles 27(8) and 81(b) of the Constitution, violating Article 3(2). Any legislation passed under the current composition is inherently legally fragile.\n";
    }

    // Insert before the prayer
    const parts = messageBody.split(/4\. PRAYER|4\. OMBI/);
    if (parts.length === 2) {
      return parts[0] + technicalBlock + (messageBody.includes('OMBI') ? "\n4. OMBI" : "\n4. PRAYER") + parts[1];
    }
    return messageBody + "\n\n" + technicalBlock;
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
    // Commit success state IMMEDIATELY to anchor the UI for mobile app-switching
    setSuccessState('submitted');

    const selectedEmails = getRecipientEmails();
    if (selectedEmails.length === 0) return;
    const to = selectedEmails.join(',');
    const encodedSubject = encodeURIComponent(subject);
    const personalizedMessage = getProcessedBody();

    // -- Hardened Clipboard Fallback --
    try {
      await navigator.clipboard.writeText(personalizedMessage);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }

    const isMobile = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const encodedBody = encodeURIComponent(personalizedMessage);

    // -- 2000 Char Limit Mitigation --
    // If the body is too long for Instagram/Mobile browsers, we use a shortened version 
    // since we already copied the full text to the clipboard.
    const useShortBody = encodedBody.length > 1800;
    const fallbackBody = encodeURIComponent(`Hey! Great job reaching here!\n\nWe've copied everything onto your device\n\nSelect all and replace everything here by tapping "Paste"\n\nSelect All -> Tap 'Paste'`);

    const finalBody = useShortBody ? fallbackBody : encodedBody;

    if (isDesktop()) {
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodedSubject}&body=${finalBody}`;
      window.open(gmailUrl, '_blank');
    } else {
      window.location.href = `mailto:${to}?subject=${encodedSubject}&body=${finalBody}`;
    }
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
            <div className="flex items-center gap-6 min-w-0">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
                  <MailBulkIcon className="w-full h-full text-kenya-green animate-pulse-gentle" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-kenya-green mt-1">Petition</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-[1000] uppercase tracking-[-0.04em] text-slate-900 dark:text-white leading-none">Submit <span className="text-kenya-green">Email</span> here</h1>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <SignatureCounter current={signatureCount} goal={signatureGoal} variant="compact" className="w-[90px]" />
              <div className="h-4 w-[1px] bg-black/5 dark:bg-white/5" />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsGalleryOpen(true)}
                  title="Templates by CEKA Community"
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 shadow-ios-soft border border-slate-200 dark:border-white/10 hover:border-kenya-green dark:hover:border-kenya-green transition-all hover:scale-105 active:scale-95 text-kenya-green"
                >
                  <LibraryIcon size={18} />
                </button>
                <button
                  onClick={() => setIsCreatorOpen(true)}
                  title="Template Creator"
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 shadow-ios-soft border border-slate-200 dark:border-white/10 hover:border-kenya-green dark:hover:border-kenya-green transition-all hover:scale-105 active:scale-95 text-kenya-green"
                >
                  <PenNewSquareIcon size={18} />
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
                <DetailsIcon size={20} className="text-kenya-green flex-shrink-0" />
                <h2 className="text-xl font-black uppercase tracking-[0.1em] text-slate-900 dark:text-white">Your Credentials</h2>
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
                  <MailSendIcon size={20} className="text-kenya-green flex-shrink-0" />
                  <h2 className="text-xl font-black uppercase tracking-[0.1em] text-slate-900 dark:text-white">Recipients</h2>
                </div>
                <button
                  onClick={() => setIsAddingEmail(true)}
                  className="text-[10px] font-black text-kenya-green uppercase tracking-widest flex items-center gap-1.5 hover:opacity-70 transition-opacity flex-shrink-0"
                >
                  <AddProfileIcon size={16} /> Add Recipient
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



            {/* ── Template Variant Selector (Exchanger: Hidden for Finance Bill) ── */}
            {!isFinanceBill && (
              <div className="space-y-3">
                <div
                  className="flex items-center justify-between gap-2 flex-wrap cursor-pointer group/style"
                  onClick={() => setIsPetitionStyleOpen(!isPetitionStyleOpen)}
                >
                  <div className="flex items-center gap-3">
                    <StarIcon size={16} className="text-kenya-green flex-shrink-0" />
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Petition Style</h3>
                  </div>
                  <div className="text-slate-400 group-hover/style:text-kenya-green transition-colors">
                    <motion.svg animate={{ rotate: isPetitionStyleOpen ? 180 : 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </motion.svg>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isPetitionStyleOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-2 pt-2 pb-4">
                        {VARIANT_META.map(v => (
                          <motion.button
                            key={v.id}
                            type="button"
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                              if (v.id === 'F') {
                                setIsGalleryOpen(true);
                              } else {
                                setSelectedVariant(v.id as VariantId);
                              }
                            }}
                            className={cn(
                              'relative p-4 rounded-2xl border text-left transition-all duration-200',
                              selectedVariant === v.id && v.id !== 'F'
                                ? 'bg-kenya-green/10 border-kenya-green/30 shadow-ios-soft'
                                : 'bg-slate-50 dark:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/10',
                              v.id === 'F' && 'border-kenya-green/30 border-dashed bg-transparent hover:bg-kenya-green/5'
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className={cn('text-[9px] font-black uppercase tracking-widest mb-1', selectedVariant === v.id ? 'text-kenya-green' : 'text-slate-400')}>
                                  Variant {v.id}
                                </p>
                                <p className={cn('text-xs font-black leading-tight', selectedVariant === v.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300')}>
                                  {v.label}
                                </p>
                                <p className="text-[9px] text-slate-400 mt-1 leading-relaxed hidden sm:block">{v.desc}</p>
                              </div>
                              {selectedVariant === v.id && v.id !== 'F' && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="h-5 w-5 rounded-full bg-kenya-green flex items-center justify-center flex-shrink-0 mt-0.5"
                                >
                                  <IOSTickIcon size={10} className="text-white" />
                                </motion.div>
                              )}
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Position Selector ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <PositionManIcon size={18} className="text-kenya-green flex-shrink-0" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Your Position</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {POSITION_META.map(p => (
                  <motion.button
                    key={p.id}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setUserPosition(p.id)}
                    className={cn(
                      'p-3 sm:p-4 rounded-2xl border text-center transition-all duration-200 font-black text-[10px] uppercase tracking-widest',
                      userPosition === p.id
                        ? p.color + ' shadow-ios-soft'
                        : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400 hover:border-slate-200 dark:hover:border-white/10'
                    )}
                  >
                    {p.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* ── Technical Objections (Finance Bill Specific) ── */}
            {isFinanceBill && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black uppercase tracking-[0.1em] text-slate-900 dark:text-white">Select Clauses</h2>
                  </div>
                  <Badge className="bg-kenya-green/10 text-kenya-green border-kenya-green/20 font-black text-[9px] uppercase tracking-widest">
                    Tap through 46 Clauses
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto p-2 custom-scrollbar">
                  {FINANCE_BILL_2026_CLAUSES.map((c) => {
                    const activePos = selectedFinanceClauses.get(c.id);
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          "rounded-[32px] border-2 transition-all duration-500 group relative overflow-hidden flex",
                          activePos === 'SUPPORT' ? "bg-kenya-green/5 border-kenya-green/40 shadow-lg shadow-kenya-green/5" :
                            activePos === 'OPPOSE' ? "bg-kenya-red/5 border-kenya-red/40 shadow-lg shadow-kenya-red/5" :
                              activePos === 'AMEND' ? "bg-amber-500/5 border-amber-500/40 shadow-lg shadow-amber-500/5" :
                                "bg-white dark:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/10"
                        )}
                      >
                        {/* 80% Content Section */}
                        <div className="w-[80%] p-5 sm:p-7 space-y-2">
                          <div className="flex items-center gap-3">
                            <Badge className={cn(
                              "font-black text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-lg border-none",
                              activePos === 'SUPPORT' ? "bg-kenya-green text-white" :
                                activePos === 'OPPOSE' ? "bg-kenya-red text-white" :
                                  activePos === 'AMEND' ? "bg-amber-500 text-white" :
                                    "bg-slate-100 dark:bg-white/10 text-slate-500"
                            )}>
                              {c.clauseId}
                            </Badge>
                            {activePos && (
                              <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-widest",
                                  activePos === 'SUPPORT' ? "text-kenya-green" :
                                    activePos === 'OPPOSE' ? "text-kenya-red" :
                                      "text-amber-600"
                                )}
                              >
                                {activePos}
                              </motion.span>
                            )}
                          </div>

                          <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight uppercase group-hover:text-kenya-green transition-colors">
                            {c.title}
                          </h4>
                          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic">
                            "{c.concern}"
                          </p>

                          {activePos === 'AMEND' && expandedAMENDId === c.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-2 overflow-hidden"
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Proposed Amendment Strategy (Optional)</p>
                                <Badge variant="outline" className="text-[7px] font-bold border-amber-500/20 text-amber-600 uppercase tracking-tighter px-1.5">User Input</Badge>
                              </div>
                              <Textarea
                                value={clauseAmendments.get(c.id) || ''}
                                onChange={(e) => updateClauseAmendment(c.id, e.target.value)}
                                placeholder="E.g., Shift charge from consumer to manufacturer, or introduce a 12-month grace period... (Skip to use professional defaults)"
                                className="bg-white/50 dark:bg-black/20 border-none text-xs font-medium placeholder:text-slate-400 focus-visible:ring-amber-500/30 rounded-xl min-h-[80px]"
                              />
                            </motion.div>
                          )}
                        </div>

                        {/* 20% Action Partition */}
                        <div className="w-[20%] border-l border-black/5 dark:border-white/5 flex flex-col items-stretch overflow-hidden bg-white/40 dark:bg-black/20">
                          <button
                            onClick={() => setFinanceClausePosition(c.id, 'SUPPORT')}
                            className={cn(
                              "flex-1 flex flex-col items-center justify-center gap-1 transition-all hover:bg-kenya-green/10",
                              activePos === 'SUPPORT' ? "bg-kenya-green text-white" : "text-slate-400"
                            )}
                          >
                            <PreciseTickIcon size={20} />
                            <span className="text-[7px] font-black uppercase tracking-widest">Support</span>
                          </button>

                          <button
                            onClick={() => setFinanceClausePosition(c.id, 'OPPOSE')}
                            className={cn(
                              "flex-1 flex flex-col items-center justify-center gap-1 border-y border-black/5 dark:border-white/5 transition-all hover:bg-kenya-red/10",
                              activePos === 'OPPOSE' ? "bg-kenya-red text-white" : "text-slate-400"
                            )}
                          >
                            <CancelCloseIcon size={20} />
                            <span className="text-[7px] font-black uppercase tracking-widest">Oppose</span>
                          </button>

                          <button
                            onClick={() => setFinanceClausePosition(c.id, 'AMEND')}
                            className={cn(
                              "flex-1 flex flex-col items-center justify-center gap-1 transition-all hover:bg-amber-500/10",
                              activePos === 'AMEND' ? "bg-amber-500 text-white" : "text-slate-400"
                            )}
                          >
                            <HourglassIcon size={18} />
                            <span className="text-[7px] font-black uppercase tracking-widest">Amend</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[9px] font-medium text-slate-400 italic">Select the clauses above to inject professional, human-toned technical grounds into your memorandum.</p>
              </div>
            )}

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
                    className="min-h-[220px] sm:min-h-[260px] rounded-[28px] sm:rounded-[32px] border-none bg-slate-50 dark:bg-white/5 text-sm sm:text-base leading-relaxed p-5 sm:p-8 custom-scrollbar font-serif text-slate-600 dark:text-slate-300 shadow-inner"
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
                    className="min-h-[120px] bg-transparent border-none text-base sm:text-xl leading-relaxed p-0 custom-scrollbar opacity-60 focus:opacity-100 transition-opacity"
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
                <div className="bg-kenya-green/5 dark:bg-kenya-green/10 p-4 rounded-3xl border border-kenya-green/10 mb-1">
                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                    <strong className="text-kenya-green dark:text-kenya-green text-xs">Anti-Spam Verification:</strong> To protect the integrity of the petition, we'll send a <strong className="text-slate-900 dark:text-white">6-digit code</strong> to your email. You only verify once.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleInitialSubmit}
                    disabled={isSubmitting}
                    className="flex-[2] h-14 sm:h-16 rounded-2xl bg-gradient-to-br from-kenya-green to-[#004d00] text-white font-black text-xs sm:text-sm uppercase tracking-widest hover:scale-[1.01] hover:shadow-2xl active:scale-[0.99] transition-all duration-300 shadow-xl shadow-kenya-green/40 gap-3 group"
                  >
                    <AnimatePresence mode="wait">
                      {isSubmitting ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-3"
                        >
                          <IOSLoadingIcon className="h-5 w-5 animate-spin" />
                          Sending...
                        </motion.div>
                      ) : (
                        <motion.div
                          key="idle"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex items-center gap-3"
                        >
                          Submit Your Petition <WriteIcon size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                        </motion.div>
                      )}
                    </AnimatePresence>
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
              <p
                className="text-[9px] font-black uppercase tracking-widest cursor-pointer hover:text-kenya-green transition-colors"
                onClick={() => {
                  const to = 'tech@civiceducationkenya.com';
                  const isDeskt = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                  if (isDeskt) {
                    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}`, '_blank');
                  } else {
                    window.location.href = `mailto:${to}`;
                  }
                }}
              >
                Contact at tech@civiceducationkenya.com for queries
              </p>
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
              setSuccessState('submitted'); // Commit state before app switch
              handleFinalDispatch();
              return true;
            }
            return false;
          }}
          onResend={() => submitSignature('Resending verification code.')}
          onCancel={() => setNeedsVerification(false)}
        />
      )}

      <TemplatesGallery isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} onSelectTemplate={handleSelectTemplate} />
      <TemplateCreator isOpen={isCreatorOpen} onClose={() => setIsCreatorOpen(false)} initialData={{ title: billTitle, body: messageBody, subject: subject, billId: billId }} />
    </div>
  );
};
