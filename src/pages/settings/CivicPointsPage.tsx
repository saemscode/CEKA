import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { GamificationService } from '@/services/gamificationService';
import { Award, TrendingUp, Zap, Star, Share2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigate } from 'react-router-dom';

// ─── Level definitions (mirrors CivicMiniPlayer) ─────────────────────────────
const CIVIC_LEVELS = [
  { min: 0,    max: 99,       level: 1, title: 'Raia',          subtitle: 'Citizen',  color: 'from-slate-400 to-slate-500' },
  { min: 100,  max: 499,      level: 2, title: 'Mfuatiliaji',   subtitle: 'Tracker',  color: 'from-sky-400 to-blue-500' },
  { min: 500,  max: 1499,     level: 3, title: 'Mzalendo',      subtitle: 'Patriot',  color: 'from-emerald-400 to-kenya-green' },
  { min: 1500, max: 4999,     level: 4, title: 'Mwanaharakati', subtitle: 'Activist', color: 'from-amber-400 to-orange-500' },
  { min: 5000, max: Infinity, level: 5, title: 'Shujaa',        subtitle: 'Hero',     color: 'from-violet-500 to-purple-600' },
];

function getCivicLevel(pts: number) {
  return CIVIC_LEVELS.find(l => pts >= l.min && pts <= l.max) ?? CIVIC_LEVELS[0];
}

function getRingPct(pts: number) {
  const lvl = getCivicLevel(pts);
  if (lvl.max === Infinity) return 100;
  return Math.min(100, Math.round(((pts - lvl.min) / (lvl.max - lvl.min + 1)) * 100));
}

// ─── Action label map ─────────────────────────────────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  quiz_pass:          'Quiz Passed',
  perfect_quiz:       'Perfect Quiz Score',
  chapter_read:       'Chapter Read',
  profile_complete:   'Profile Completed',
  resource_published: 'Resource Published',
  volunteer_signup:   'Volunteer Signup',
};

const CivicPointsPage: React.FC = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [s, h, lb, b] = await Promise.all([
        GamificationService.getUserStats(user.id),
        GamificationService.getPointsHistory(user.id, 30),
        GamificationService.getLeaderboard(10),
        (supabase as any).from('user_badges').select('*, civic_badges(*)').eq('user_id', user.id),
      ]);
      setStats(s);
      setHistory(h || []);
      setLeaderboard(lb || []);
      setBadges(b?.data || []);
      setLoading(false);
    })();
  }, [user]);

  if (!session) return <Navigate to="/auth" replace />;

  const totalPoints = stats?.total_points ?? 0;
  const lvlData = getCivicLevel(totalPoints);
  const ringPct = getRingPct(totalPoints);
  const nextLevel = CIVIC_LEVELS[(lvlData.level - 1) + 1];
  const ptsToNext = nextLevel ? nextLevel.min - totalPoints : 0;
  const userRank = stats?.rank ?? null;

  const handleShare = async () => {
    const text = `My CEKA Civic Score: ${totalPoints.toLocaleString()} pts | ${lvlData.title} (${lvlData.subtitle}) — ceka.africa`;
    if (navigator.share) await navigator.share({ title: 'My CEKA Civic Impact', text, url: 'https://ceka.africa' }).catch(() => {});
    else navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-2xl space-y-6">

        {/* Hero score card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative rounded-3xl overflow-hidden p-6 bg-gradient-to-br ${lvlData.color} shadow-2xl`}
        >
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
            <Trophy className="w-40 h-40 text-white" />
          </div>

          <div className="flex items-center gap-6">
            {/* Ring */}
            <div className="relative w-28 h-28 shrink-0">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                <motion.circle
                  cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 40}
                  initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 40 - (ringPct / 100) * 2 * Math.PI * 40 }}
                  transition={{ duration: 1.4, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white leading-none">{totalPoints.toLocaleString()}</span>
                <span className="text-[9px] text-white/70 font-bold uppercase tracking-widest">pts</span>
              </div>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <Badge className="mb-2 bg-white/20 text-white border-none text-[10px] font-black uppercase tracking-widest">
                Level {lvlData.level}
              </Badge>
              <h2 className="text-2xl font-black text-white leading-tight">{lvlData.title}</h2>
              <p className="text-white/70 text-sm font-semibold">{lvlData.subtitle}</p>
              {userRank && (
                <p className="text-white/80 text-xs mt-1">🏅 Rank #{userRank} on CEKA</p>
              )}
              {nextLevel && (
                <p className="text-white/60 text-xs mt-1">
                  {ptsToNext.toLocaleString()} pts to <span className="font-bold text-white">{nextLevel.title}</span>
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={handleShare}
            variant="ghost"
            className="mt-4 w-full border border-white/30 text-white hover:bg-white/20 rounded-2xl font-bold text-xs"
          >
            <Share2 className="w-3.5 h-3.5 mr-2" />
            Share My Impact
          </Button>
        </motion.div>

        {/* Level ladder */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl bg-white dark:bg-slate-900 shadow-ios-high p-5 space-y-3"
        >
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-white/30">Civic Ladder</h3>
          {CIVIC_LEVELS.map((lvl) => {
            const isActive = lvlData.level === lvl.level;
            const isComplete = totalPoints > lvl.max;
            return (
              <div key={lvl.level} className={`flex items-center gap-3 p-3 rounded-2xl transition ${isActive ? 'bg-slate-50 dark:bg-white/5 ring-1 ring-slate-200 dark:ring-white/10' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black bg-gradient-to-br ${lvl.color} text-white shrink-0`}>
                  {lvl.level}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-white/30'}`}>
                    {lvl.title} <span className="font-normal text-xs">({lvl.subtitle})</span>
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-white/25">
                    {lvl.max === Infinity ? `${lvl.min.toLocaleString()}+ pts` : `${lvl.min.toLocaleString()} – ${lvl.max.toLocaleString()} pts`}
                  </p>
                </div>
                {(isComplete || isActive) && (
                  <Star className={`w-4 h-4 shrink-0 ${isComplete ? 'text-amber-400' : 'text-slate-200 dark:text-white/20'}`} fill={isComplete ? 'currentColor' : 'none'} />
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Badges */}
        {badges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-3xl bg-white dark:bg-slate-900 shadow-ios-high p-5"
          >
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-white/30 mb-3">Earned Badges</h3>
            <div className="flex flex-wrap gap-2">
              {badges.map((ub: any, i: number) => {
                const b = ub.civic_badges;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedBadge(selectedBadge?.name === b?.name ? null : b)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition ${selectedBadge?.name === b?.name ? 'bg-amber-500/20 border-amber-500/50 shadow-sm' : 'bg-amber-500/10 border-amber-500/20'} text-amber-600 dark:text-amber-300`}
                  >
                    {b?.icon_url ? <img src={b.icon_url} alt={b.name} className="w-4 h-4 rounded object-contain" /> : <Award className="w-3.5 h-3.5" />}
                    <span className="text-xs font-bold">{b?.name || 'Badge'}</span>
                  </button>
                );
              })}
            </div>
            <AnimatePresence>
              {selectedBadge && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mt-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 overflow-hidden"
                >
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{selectedBadge.name}</p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-200/60 mt-0.5 leading-relaxed">
                    {selectedBadge.description || 'Awarded for outstanding civic participation on CEKA.'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl bg-white dark:bg-slate-900 shadow-ios-high p-5"
          >
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-white/30 mb-3">Top Citizens</h3>
            <div className="space-y-2">
              {leaderboard.map((entry: any, i: number) => (
                <div key={i} className={`flex items-center gap-3 p-2.5 rounded-2xl ${entry.user_id === user?.id ? 'bg-kenya-green/5 ring-1 ring-kenya-green/20' : ''}`}>
                  <span className={`w-6 text-center text-xs font-black shrink-0 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-300 dark:text-white/20'}`}>
                    #{i + 1}
                  </span>
                  <p className="flex-1 text-sm font-bold text-slate-700 dark:text-white truncate">{entry.full_name || 'Civic Citizen'}</p>
                  <span className="text-xs font-black text-kenya-green">{(entry.total_points ?? 0).toLocaleString()} pts</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* History */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-3xl bg-white dark:bg-slate-900 shadow-ios-high p-5"
        >
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-white/30 mb-3">Points History</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-kenya-green border-t-transparent rounded-full" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2 text-slate-300 dark:text-white/20">
              <TrendingUp className="w-8 h-8" />
              <p className="text-xs font-medium text-slate-400 dark:text-white/30">No activity yet. Start engaging with CEKA to earn points!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-50 dark:border-white/5 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-kenya-green/10 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-kenya-green" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-white truncate">
                        {ACTION_LABELS[item.action] || item.action?.replace(/_/g, ' ') || 'Activity'}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-white/30">
                        {new Date(item.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-kenya-green shrink-0">+{item.amount ?? 0} pts</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

    </div>
  );
};

export default CivicPointsPage;
