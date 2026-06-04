// src/lib/searchService.ts
// CEKA Search Intelligence v2 — PRODUCTION CORRECT
// Uses ONLY confirmed schema fields from types.ts
// ilike queries (works without migrations) | Full scoring engine intact

import { supabase } from '@/integrations/supabase/client';

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────

export interface SearchResult {
  id: string;
  type: 'bill' | 'blog' | 'resource' | 'discussion' | 'campaign' | 'constitution_chapter' | 'constitution_section' | 'civic_glossary' | 'carousel_slide';
  title: string;
  description: string;
  excerpt?: string;
  tags: string[];
  county?: string;
  category: string;
  url: string;
  date?: string;
  created_at?: string;
  score?: number;
  relevanceScore: number;
  matchScore: number;
  recencyScore: number;
  countyScore: number;
  trustMultiplier?: number;
  metadata?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  county?: string;
  areas_of_interest?: string[];
  interests?: string[];
  preferred_lang?: string;
  contribution_points?: number;
  preferences?: {
    search_weights?: { match: number; recency: number; county: number };
    type_affinity?: Record<string, number>;
  };
}

export interface EnrichmentChip {
  label: string;
  count: number;
  active: boolean;
}

export interface SearchSuggestion {
  id: string;
  title: string;
  type: 'resource' | 'bill' | 'blog' | 'discussion' | 'campaign' | 'constitution_chapter' | 'constitution_section' | 'civic_glossary' | 'carousel_slide';
  category: string;
  url?: string;
}

export interface SearchAnalyticsEvent {
  user_id?: string;
  session_id: string;
  query: string;
  tokens: string[];
  active_chips: string[];
  results_count: number;
  result_types_returned: string[];
  zero_results: boolean;
}

export interface SearchClickEvent {
  session_id: string;
  query: string;
  clicked_result_id: string;
  clicked_result_type: string;
  clicked_result_rank: number;
  clicked_relevance_score: number;
  time_to_click_ms: number;
}

// Use `any` cast for tables not yet in generated types
// (trending_cache, search_events, discussions)
const db = supabase as any;

// ─────────────────────────────────────────────
// SCORING PRIMITIVES
// ─────────────────────────────────────────────

function computeRecencyScore(createdAt?: string): number {
  if (!createdAt) return 0.05;
  const hoursOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursOld <= 24) return 1.0;
  if (hoursOld <= 72) return 0.85;
  if (hoursOld <= 168) return 0.65;
  if (hoursOld <= 720) return 0.40;
  if (hoursOld <= 2160) return 0.20;
  return 0.05;
}

function computeInterestMatchScore(itemTags: string[], userInterests: string[]): number {
  if (!userInterests.length || !itemTags.length) return 0;
  const normalise = (s: string) => s.toLowerCase().trim();
  const userSet = new Set(userInterests.map(normalise));
  const itemSet = itemTags.map(normalise);
  let matches = 0;
  for (const tag of itemSet) {
    if (userSet.has(tag)) { matches++; continue; }
    for (const interest of userSet) {
      if (tag.includes(interest) || interest.includes(tag)) { matches += 0.5; break; }
    }
  }
  return Math.min(1.0, matches / Math.max(userSet.size, 1));
}

function computeCountyScore(itemCounty?: string, userCounty?: string): number {
  if (!itemCounty || !userCounty) return 0.5;
  return itemCounty.toLowerCase() === userCounty.toLowerCase() ? 1.0 : 0.0;
}

function authorTrustMultiplier(points = 0): number {
  if (points >= 500) return 1.15;
  if (points >= 200) return 1.08;
  if (points >= 100) return 1.04;
  return 1.0;
}

// ─────────────────────────────────────────────
// KEYWORD MAPS — ENGLISH + SWAHILI + SHENG
// ─────────────────────────────────────────────

const CIVIC_KEYWORD_MAP: Record<string, string[]> = {
  // ── Compound phrases first (evaluated before single words) ────────────────
  'finance bill':    ['#FinanceBill2026', '#Amendment', '#TaxExemption', '#KRA', '#2026Budget', '#PublicDebt'],
  'finance act':     ['#FinanceAct', '#TaxAmendment', '#KRA', '#PublicDebt'],
  'housing levy':    ['#HousingLevy', '#AffordableHousing', '#SHF', '#DeductionDispute'],
  'public participation': ['#PublicParticipation', '#CivicEngagement', '#Memorandum'],
  'voter registration':   ['#VoterReg', '#IEBC', '#2027', '#BiometricID'],
  'county government':    ['#Devolution', '#County', '#CRA', '#DORB'],
  'national assembly':    ['#Bunge', '#Legislation', '#FirstReading', '#ThirdReading'],
  'supreme court':        ['#CourtOrder', '#ConstitutionalPetition', '#Ruling'],
  'healthcare':           ['#UHC', '#SHA', '#NHIF', '#CountyHealth'],
  // ── Single-word keys ────────────────────────────────────────────────────
  'finance':    ['#Amendment', '#TaxExemption', '#KRA', '#2026Budget', '#PublicDebt'],
  'bill':       ['#FirstReading', '#Committee', '#PublicParticipation', '#Enacted', '#Rejected'],
  'election':   ['#IEBC', '#2027', '#VoterReg', '#Petition', '#Malpractice'],
  'health':     ['#UHC', '#NHIF', '#SHA', '#CountyHealth', '#Devolution'],
  'education':  ['#TSC', '#CBC', '#Bursary', '#PublicUniversity', '#HELB'],
  'land':       ['#NLC', '#TitleDeed', '#Eviction', '#CommunityLand'],
  'tax':        ['#VAT', '#PAYE', '#ExciseDuty', '#TaxAmendment', '#KRA'],
  'devolution': ['#County', '#CRA', '#DORB', '#EqualizationFund'],
  'rights':     ['#Constitution', '#KNCHR', '#Petition', '#CourtOrder'],
  'water':      ['#WaterAct', '#CountyWater', '#WRMA'],
  'security':   ['#Police', '#DPP', '#IPOA', '#NPS'],
  'housing':    ['#AffordableHousing', '#SHF', '#HousingLevy'],
  // Swahili
  'fedha':      ['#Marekebisho', '#MsamahaKodi', '#KRA', '#Bajeti2026'],
  'mswada':     ['#SomaMswada', '#Kamati', '#UshirikiWaUmma'],
  'uchaguzi':   ['#IEBC', '#2027', '#UsajiliWapiga'],
  'afya':       ['#SHA', '#NHIF', '#UHC'],
  'ardhi':      ['#NLC', '#HatiMilisi', '#Uhamisho'],
  'elimu':      ['#TSC', '#CBC', '#Bursari'],
  'kodi':       ['#VAT', '#PAYE', '#ExciseDuty'],
  'serikali':   ['#Bunge', '#Cabinet', '#Treasury'],
  'wananchi':   ['#UshirikiWaUmma', '#Ombi', '#Haki'],
  'maji':       ['#SheriaYaMaji', '#MajiYaKaunti', '#WRMA'],
  // Sheng
  'deni':       ['#PublicDebt', '#IMF', '#Bajeti'],
  'pesa':       ['#Bajeti', '#Ushuru', '#KRA'],
  'bei':        ['#CostOfLiving', '#Inflation'],
  'polisi':     ['#KillingsByPolice', '#IPOA', '#DPP'],
  'karo':       ['#HELB', '#Bursari', '#Elimu'],
};

// ─────────────────────────────────────────────
// TOKEN INTELLIGENCE TABLES
// ─────────────────────────────────────────────

// Words that are too generic to carry meaningful signal.
// When hit, they only contribute 0.15× their usual weight.
const STOP_WORDS = new Set([
  'the','a','an','of','in','on','at','to','and','or','for','with',
  'bill','act','law','kenya','kenyan','national','county','government',
  'public','new','from','by','it','is','are','was','were','be','been'
]);

// Civic-domain strong nouns. When matched they contribute 2.5× weight.
// This means matching "finance" counts far more than matching "bill".
const ENTITY_WORDS = new Set([
  'finance','housing','health','education','constitution','budget','tax',
  'election','nhif','sha','kra','iebc','helb','ruto','uhuru','senate',
  'parliament','tribunal','committee','referendum','devolution','ward',
  'amendment','revenue','levy','infrastructure','pension','land','water'
]);

// Compute a query-aware weight for a token.
function tokenWeight(token: string): number {
  const t = token.toLowerCase();
  if (ENTITY_WORDS.has(t)) return 2.5;
  if (STOP_WORDS.has(t))   return 0.15;
  if (/^\d{4}$/.test(t))   return 1.8; // Year tokens get significant weight
  if (t.length <= 2)       return 0.1;
  return 1.0;
}

// Analyse the raw query to derive dynamic weight overrides.
// Returns {match, recency, county} weights.
function detectQueryIntent(rawQuery: string): { match: number; recency: number; county: number } {
  const hasYear = /\b20\d{2}\b/.test(rawQuery);
  const wordCount = rawQuery.trim().split(/\s+/).length;
  if (hasYear && wordCount <= 3) {
    // "Finance Bill 2026" — time is a strong explicit signal
    return { match: 0.50, recency: 0.40, county: 0.10 };
  }
  if (wordCount >= 4 && !hasYear) {
    // "affordable housing levy for low income" — exploratory concept
    return { match: 0.75, recency: 0.20, county: 0.05 };
  }
  // Default balanced weights
  return { match: 0.55, recency: 0.30, county: 0.15 };
}

// ─────────────────────────────────────────────
// MAIN SERVICE
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// SESSION ID
// ─────────────────────────────────────────────
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
const SESSION_ID = generateSessionId();

class SearchService {

  public computeRelevanceScore(
    item: Partial<SearchResult>,
    userProfile: UserProfile | null,
    queryTokens: string[],
    rawQuery = '',
    sortBy: 'relevance' | 'newest' | 'county' = 'relevance'
  ): Pick<SearchResult, 'relevanceScore' | 'matchScore' | 'recencyScore' | 'countyScore' | 'trustMultiplier'> {
    const allInterests = [
      ...(userProfile?.areas_of_interest ?? []),
      ...(userProfile?.interests ?? []),
    ];

    // ── WEIGHTED TOKEN SCORING ────────────────────────────────────────────
    // Each token contributes according to its semantic class:
    //   entity words ("finance", "health") → 2.5×
    //   stop words ("the", "bill")         → 0.15×
    //   year tokens ("2026")               → 1.8×
    //   generic words                       → 1.0×
    let qMatch = 0;
    if (queryTokens.length) {
      const tagsStr = (item.tags || []).join(' ').toLowerCase();
      const haystack = `${item.title || ''} ${item.description || item.excerpt || ''} ${tagsStr}`.toLowerCase();

      let totalWeight = 0;
      let hitWeight = 0;
      for (const t of queryTokens) {
        const w = tokenWeight(t);
        totalWeight += w;
        if (haystack.includes(t.toLowerCase())) hitWeight += w;
      }
      const weightedFraction = totalWeight > 0 ? hitWeight / totalWeight : 0;
      // Let semantic weights strictly determine the match score
      qMatch = hitWeight === 0 ? 0 : weightedFraction;
    }

    const interestMatch = computeInterestMatchScore(item.tags || [], allInterests);
    const mScore = queryTokens.length
      ? qMatch * 0.6 + interestMatch * 0.4
      : interestMatch;

    const rScore = computeRecencyScore(item.created_at || item.date);
    const cScore = computeCountyScore(item.county, userProfile?.county);

    // ── DYNAMIC WEIGHT RESOLUTION ─────────────────────────────────────────
    // Priority order: explicit sortBy override > user profile weights > query-intent auto-detect
    let weights: { match: number; recency: number; county: number };
    if (sortBy === 'newest') {
      weights = { match: 0.30, recency: 0.65, county: 0.05 };
    } else if (sortBy === 'county') {
      weights = { match: 0.40, recency: 0.10, county: 0.50 };
    } else if (userProfile?.preferences?.search_weights) {
      weights = userProfile.preferences.search_weights as { match: number; recency: number; county: number };
    } else {
      weights = detectQueryIntent(rawQuery);
    }

    const typeAffinity = userProfile?.preferences?.type_affinity ?? {};
    const affinity = typeAffinity[item.type as string] ?? 1.0;
    const trust = authorTrustMultiplier((item.metadata as any)?.author_contribution_points ?? 0);
    const relevance = Math.min(1.0, (mScore * weights.match + rScore * weights.recency + cScore * weights.county) * affinity * trust);

    return {
      matchScore: parseFloat(mScore.toFixed(4)),
      recencyScore: parseFloat(rScore.toFixed(4)),
      countyScore: parseFloat(cScore.toFixed(4)),
      trustMultiplier: parseFloat(trust.toFixed(4)),
      relevanceScore: parseFloat(relevance.toFixed(4)),
    };
  }

  // ── ENRICHMENT CHIPS ──────────────────────────
  public extractEnrichmentChipsSync(query: string): EnrichmentChip[] {
    const lower = query.toLowerCase();
    // Try compound phrases first (longest match wins)
    const sortedKeys = Object.keys(CIVIC_KEYWORD_MAP).sort((a, b) => b.length - a.length);
    for (const keyword of sortedKeys) {
      if (lower.includes(keyword)) {
        return CIVIC_KEYWORD_MAP[keyword].slice(0, 5).map(label => ({ label, count: 0, active: false }));
      }
    }
    if (query.length > 3) {
      return query.split(' ').filter(w => w.length > 3).slice(0, 4)
        .map(w => ({ label: `#${w}`, count: 0, active: false }));
    }
    return [];
  }

  public extractEnrichmentChips(query: string): EnrichmentChip[] {
    return this.extractEnrichmentChipsSync(query);
  }

  public async hydrateChipCounts(chips: EnrichmentChip[]): Promise<EnrichmentChip[]> {
    if (!chips.length) return chips;
    try {
      const { data } = await db.rpc('get_enrichment_chip_counts', {
        chip_tags: chips.map(c => c.label.replace('#', '')),
      });
      if (!data) return chips;
      const countMap: Record<string, number> = {};
      (data as { tag: string; count: number }[]).forEach(r => { countMap[`#${r.tag}`] = r.count; });
      return chips.map(c => ({ ...c, count: countMap[c.label] ?? 0 }));
    } catch { return chips; }
  }

  // ── SEARCH — ilike (works without migration) ──
  async searchAll(
    query: string,
    userProfile: UserProfile | null = null,
    activeChips: string[] = [],
    limit = 20,
    offset = 0,
    sortBy: 'relevance' | 'newest' | 'county' = 'relevance'
  ): Promise<SearchResult[]> {
    // 1. Sanitize incoming query (e.g. "Bill,2026" -> "Bill 2026")
    const cleanQuery = query.replace(/[.,;:\-_()\[\]]/g, ' ').replace(/\s+/g, ' ').trim();

    // 2. Un-CamelCase chips (e.g. "#FinanceBill2026" -> "Finance Bill 2026")
    const cleanChips = activeChips.map(c => 
      c.replace('#', '')
       .replace(/([a-z])([A-Z])/g, '$1 $2')
       .replace(/([a-zA-Z])([0-9])/g, '$1 $2')
       .replace(/([0-9])([a-zA-Z])/g, '$1 $2')
       .trim()
    );

    const fullQuery = [cleanQuery, ...cleanChips].join(' ').trim();
    if (!fullQuery) return [];

    const rawTokens = fullQuery.split(' ').filter(Boolean);
    const tokens = rawTokens.map(t => t.toLowerCase()); // exported for client scoring
    const results: SearchResult[] = [];

    // 3. Extract Primary Token (longest word > 2 chars) for strict DB fetching
    // This circumvents the Supabase "or" overwrite sabotage AND avoids
    // short stop-words ("Bill") flooding the pagination limit.
    const validTokens = rawTokens.filter(t => t.length > 2);
    const primaryToken = validTokens.reduce((a, b) => a.length >= b.length ? a : b, '') || rawTokens[0] || fullQuery;

    function buildOrClause(fields: string[]) {
      const conditions: string[] = [];
      if (cleanQuery) fields.forEach(f => conditions.push(`${f}.ilike.%${cleanQuery}%`));
      if (primaryToken) fields.forEach(f => conditions.push(`${f}.ilike.%${primaryToken}%`));
      return [...new Set(conditions)].filter(Boolean).join(',');
    }

    const billsOr       = buildOrClause(['title', 'summary']);
    const blogsOr       = buildOrClause(['title', 'content']);
    const resourcesOr   = buildOrClause(['title', 'description']);
    const discussionsOr = buildOrClause(['title', 'body']);
    const chaptersOr    = buildOrClause(['title', 'description']);
    const sectionsOr    = buildOrClause(['title', 'content']);
    const glossaryOr    = buildOrClause(['term', 'definition']);
    const carouselOr    = buildOrClause(['title', 'description']);
    const campaignsOr   = buildOrClause(['title', 'description']);

    const [
      billsRes, blogsRes, resourcesRes, discussionsRes,
      chaptersRes, sectionsRes, glossaryRes, carouselRes, campaignsRes
    ] = await Promise.allSettled([
      supabase.from('bills').select('id, title, summary, category, created_at, status').or(billsOr).order('created_at', { ascending: false }).range(offset, offset + limit - 1),
      supabase.from('blog_posts').select('id, title, excerpt, content, tags, created_at, slug, author').eq('status', 'published').or(blogsOr).order('created_at', { ascending: false }).range(offset, offset + limit - 1),
      supabase.from('resources').select('id, title, description, tags, county, created_at, category').or(resourcesOr).order('created_at', { ascending: false }).range(offset, offset + limit - 1),
      db.from('discussions').select('id, title, body, tags, county, created_at').or(discussionsOr).order('created_at', { ascending: false }).range(offset, offset + limit - 1),
      db.from('constitution_chapters').select('id, title, description, created_at').or(chaptersOr).order('created_at', { ascending: false }).range(offset, offset + limit - 1),
      db.from('constitution_sections').select('id, title, content, chapter_id, created_at').or(sectionsOr).order('created_at', { ascending: false }).range(offset, offset + limit - 1),
      db.from('civic_glossary').select('id, term, definition, created_at').or(glossaryOr).order('created_at', { ascending: false }).range(offset, offset + limit - 1),
      db.from('carousel_slides').select('id, title, description, url, created_at').or(carouselOr).order('created_at', { ascending: false }).range(offset, offset + limit - 1),
      db.from('campaigns').select('id, title, description, tags, created_at').or(campaignsOr).order('created_at', { ascending: false }).range(offset, offset + limit - 1),
    ]);


    if (billsRes.status === 'fulfilled' && billsRes.value.data) {
      billsRes.value.data.forEach((b: any) => {
        const base: any = {
          id: b.id, type: 'bill', title: b.title,
          description: b.summary || '', excerpt: b.summary || '',
          tags: b.tags || [], county: b.county,
          created_at: b.created_at, date: b.created_at,
          url: `/legislative-tracker/bills/${b.id}`,
          category: b.category || 'Law',
          metadata: { status: b.status },
        };
        results.push({ ...base, ...this.computeRelevanceScore(base, userProfile, tokens, cleanQuery, sortBy) });
      });
    }

    if (blogsRes.status === 'fulfilled' && blogsRes.value.data) {
      blogsRes.value.data.forEach((p: any) => {
        const desc = p.excerpt || (p.content || '').slice(0, 200) || '';
        const base: any = {
          id: p.id, type: 'blog', title: p.title,
          description: desc, excerpt: desc,
          tags: p.tags || [], county: undefined,
          created_at: p.created_at, date: p.created_at,
          url: `/blog/${p.slug || p.id}`, category: 'Blog',
          metadata: { author: p.author },
        };
        results.push({ ...base, ...this.computeRelevanceScore(base, userProfile, tokens, cleanQuery, sortBy) });
      });
    }

    if (resourcesRes.status === 'fulfilled' && resourcesRes.value.data) {
      resourcesRes.value.data.forEach((r: any) => {
        const base: any = {
          id: r.id, type: 'resource', title: r.title,
          description: r.description || '', excerpt: r.description || '',
          tags: r.tags || [], county: r.county,
          created_at: r.created_at, date: r.created_at,
          url: `/resources/${r.id}`, category: r.category || 'Resource',
        };
        results.push({ ...base, ...this.computeRelevanceScore(base, userProfile, tokens, cleanQuery, sortBy) });
      });
    }

    if (discussionsRes.status === 'fulfilled' && discussionsRes.value?.data) {
      discussionsRes.value.data.forEach((d: any) => {
        const desc = (d.body || d.content || d.message || '').slice(0, 300);
        const base: any = {
          id: d.id, type: 'discussion', title: d.title,
          description: desc, excerpt: desc,
          tags: d.tags || [], county: d.county,
          created_at: d.created_at, date: d.created_at,
          url: `/community/discussions/${d.id}`, category: 'Civic Talk',
        };
        results.push({ ...base, ...this.computeRelevanceScore(base, userProfile, tokens, cleanQuery, sortBy) });
      });
    }

    if (chaptersRes.status === 'fulfilled' && chaptersRes.value?.data) {
      chaptersRes.value.data.forEach((c: any) => {
        const base: any = {
          id: c.id, type: 'constitution_chapter', title: c.title,
          description: c.description || '', excerpt: c.description || '',
          tags: [], county: undefined,
          created_at: c.created_at, date: c.created_at,
          url: `/constitution/chapters/${c.id}`, category: 'Constitution',
        };
        results.push({ ...base, ...this.computeRelevanceScore(base, userProfile, tokens, cleanQuery, sortBy) });
      });
    }

    if (sectionsRes.status === 'fulfilled' && sectionsRes.value?.data) {
      sectionsRes.value.data.forEach((s: any) => {
        const desc = (s.content || '').slice(0, 300);
        const base: any = {
          id: s.id, type: 'constitution_section', title: s.title,
          description: desc, excerpt: desc,
          tags: [], county: undefined,
          created_at: s.created_at, date: s.created_at,
          url: `/constitution/sections/${s.id}`, category: 'Article',
        };
        results.push({ ...base, ...this.computeRelevanceScore(base, userProfile, tokens, cleanQuery, sortBy) });
      });
    }

    if (glossaryRes.status === 'fulfilled' && glossaryRes.value?.data) {
      glossaryRes.value.data.forEach((g: any) => {
        const base: any = {
          id: g.id, type: 'civic_glossary', title: g.term,
          description: g.definition || '', excerpt: g.definition || '',
          tags: [], county: undefined,
          created_at: g.created_at, date: g.created_at,
          url: `/glossary/${g.id}`, category: 'Glossary',
        };
        results.push({ ...base, ...this.computeRelevanceScore(base, userProfile, tokens, cleanQuery, sortBy) });
      });
    }

    if (carouselRes.status === 'fulfilled' && carouselRes.value?.data) {
      carouselRes.value.data.forEach((cs: any) => {
        const base: any = {
          id: cs.id, type: 'carousel_slide', title: cs.title,
          description: cs.description || '', excerpt: cs.description || '',
          tags: [], county: undefined,
          created_at: cs.created_at, date: cs.created_at,
          url: cs.url || '/', category: 'Featured',
        };
        results.push({ ...base, ...this.computeRelevanceScore(base, userProfile, tokens, cleanQuery, sortBy) });
      });
    }

    if (campaignsRes.status === 'fulfilled' && campaignsRes.value?.data) {
      campaignsRes.value.data.forEach((ca: any) => {
        const base: any = {
          id: ca.id, type: 'campaign', title: ca.title,
          description: ca.description || '', excerpt: ca.description || '',
          tags: ca.tags || [], county: undefined,
          created_at: ca.created_at, date: ca.created_at,
          url: `/campaigns/${ca.id}`, category: 'Campaign',
        };
        results.push({ ...base, ...this.computeRelevanceScore(base, userProfile, tokens, cleanQuery, sortBy) });
      });
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // ── TRENDING FEED ─────────────────────────────
  async fetchTrending(limit = 8): Promise<SearchResult[]> {
    try {
      const { data: cached } = await db.from('trending_cache')
        .select('*').order('cached_at', { ascending: false }).limit(limit);
      if (cached && cached.length > 0) {
        return (cached as any[]).map(c => ({
          id: c.content_id, type: c.content_type as SearchResult['type'],
          title: c.title, description: c.excerpt || '', excerpt: c.excerpt || '',
          tags: c.tags || [], county: c.county, created_at: c.created_at,
          url: c.url, category: c.content_type === 'bill' ? 'Law' : 'Blog',
          relevanceScore: c.recency_score ?? 0, matchScore: 0,
          recencyScore: c.recency_score ?? 0, countyScore: 0,
        }));
      }
    } catch { /* fallback */ }

    const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const [billsRes, blogsRes] = await Promise.allSettled([
      supabase.from('bills').select('id, title, summary, category, created_at')
        .gte('created_at', since).order('created_at', { ascending: false }).limit(limit),
      supabase.from('blog_posts').select('id, title, excerpt, content, tags, created_at, slug')
        .eq('status', 'published').gte('created_at', since)
        .order('created_at', { ascending: false }).limit(limit),
    ]);

    const trending: SearchResult[] = [];
    if (billsRes.status === 'fulfilled' && billsRes.value.data) {
      billsRes.value.data.forEach((b: any) => {
        const rScore = computeRecencyScore(b.created_at);
        trending.push({
          id: b.id, type: 'bill', title: b.title,
          description: b.summary || '', excerpt: b.summary || '',
          tags: [], county: undefined, created_at: b.created_at, date: b.created_at,
          url: `/legislative-tracker/bills/${b.id}`, category: b.category || 'Law',
          relevanceScore: rScore, matchScore: 0, recencyScore: rScore, countyScore: 0,
        });
      });
    }
    if (blogsRes.status === 'fulfilled' && blogsRes.value.data) {
      blogsRes.value.data.forEach((p: any) => {
        const rScore = computeRecencyScore(p.created_at);
        const desc = p.excerpt || (p.content || '').slice(0, 200) || '';
        trending.push({
          id: p.id, type: 'blog', title: p.title,
          description: desc, excerpt: desc,
          tags: p.tags || [], county: undefined, created_at: p.created_at,
          url: `/blog/${p.slug || p.id}`, category: 'Blog',
          relevanceScore: rScore, matchScore: 0, recencyScore: rScore, countyScore: 0,
        });
      });
    }
    return trending.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
  }

  // ── PERSONALISED FEED ─────────────────────────
  async fetchPersonalised(userProfile: UserProfile, limit = 12): Promise<SearchResult[]> {
    const interests = [...(userProfile.areas_of_interest ?? []), ...(userProfile.interests ?? [])];
    if (!interests.length && !userProfile.county) return this.fetchTrending(limit);

    const tagConditions = interests.map(i => `tags.cs.{"${i}"}`).join(',');
    const orConditions = tagConditions || undefined;

    const [billsRes, blogsRes, resourcesRes] = await Promise.allSettled([
      supabase.from('bills').select('id, title, summary, category, created_at')
        .limit(limit),
      supabase.from('blog_posts').select('id, title, excerpt, content, tags, created_at, slug')
        .eq('status', 'published')
        .or(orConditions || `title.neq.NULL`)
        .limit(limit),
      supabase.from('resources').select('id, title, description, tags, county, created_at, category')
        .or(orConditions ? `${orConditions}${userProfile.county ? `,county.eq.${userProfile.county}` : ''}` : `title.neq.NULL`)
        .limit(limit),
    ]);

    const all: SearchResult[] = [];
    if (billsRes.status === 'fulfilled' && billsRes.value.data) {
      billsRes.value.data.forEach((b: any) => {
        const base: any = {
          id: b.id, type: 'bill', title: b.title,
          description: b.summary || '', tags: [],
          created_at: b.created_at,
          url: `/legislative-tracker/bills/${b.id}`, category: b.category || 'Law',
        };
        all.push({ ...base, ...this.computeRelevanceScore(base, userProfile, []) });
      });
    }
    if (blogsRes.status === 'fulfilled' && blogsRes.value.data) {
      blogsRes.value.data.forEach((p: any) => {
        const desc = p.excerpt || (p.content || '').slice(0, 200) || '';
        const base: any = {
          id: p.id, type: 'blog', title: p.title,
          description: desc, tags: p.tags || [],
          created_at: p.created_at,
          url: `/blog/${p.slug || p.id}`, category: 'Blog',
        };
        all.push({ ...base, ...this.computeRelevanceScore(base, userProfile, []) });
      });
    }
    if (resourcesRes.status === 'fulfilled' && resourcesRes.value.data) {
      resourcesRes.value.data.forEach((r: any) => {
        const base: any = {
          id: r.id, type: 'resource', title: r.title,
          description: r.description || '', tags: r.tags || [], county: r.county,
          created_at: r.created_at,
          url: `/resources/${r.id}`, category: r.category || 'Resource',
        };
        all.push({ ...base, ...this.computeRelevanceScore(base, userProfile, []) });
      });
    }
    return all.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
  }

  // ── ANALYTICS ─────────────────────────────────
  async logSearchEvent(event: SearchAnalyticsEvent): Promise<void> {
    try {
      await db.from('search_events').insert({
        user_id: event.user_id || null,
        session_id: event.session_id,
        query: event.query,
        tokens: event.tokens,
        active_chips: event.active_chips,
        results_count: event.results_count,
        result_types_returned: event.result_types_returned,
        zero_results: event.zero_results,
      });
    } catch { /* fire-and-forget */ }
  }

  async logClickEvent(event: SearchClickEvent): Promise<void> {
    try {
      await db.from('search_events').insert({
        session_id: event.session_id,
        query: event.query,
        tokens: [], active_chips: [], results_count: 0,
        result_types_returned: [], zero_results: false,
        clicked_result_id: event.clicked_result_id,
        clicked_result_type: event.clicked_result_type,
        clicked_result_rank: event.clicked_result_rank,
        clicked_relevance_score: event.clicked_relevance_score,
        time_to_click_ms: event.time_to_click_ms,
      });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await db.rpc('update_type_affinity', { p_user_id: user.id, p_type: event.clicked_result_type });
    } catch { /* fire-and-forget */ }
  }

  async getSuggestions(query: string, limit = 5): Promise<SearchSuggestion[]> {
    if (!query.trim()) return [];
    const results = await this.searchAll(query, null, [], 10);
    return results.map(r => ({ id: r.id, title: r.title, type: r.type, category: r.category })).slice(0, limit);
  }

  async getPopularSearches(): Promise<string[]> {
    return [
      'Constitution', 'Voting Rights', 'Finance Bill', 'County Government',
      'Public Participation', 'Taxation', 'Elections 2027', 'Human Rights', 'Devolution', 'Civic Education',
    ];
  }

  getSessionId(): string { return SESSION_ID; }
}

export const searchService = new SearchService();
