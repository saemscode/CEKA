/**
 * CEKA — Canonical Kenyan Legislative Bill Stages
 *
 * Exactly 9 ordered stages (Pre-publication → Publication/Commencement)
 * plus a special "Discarded" state that can occur at any stage.
 *
 * Source: Kenya National Assembly Standing Orders & Senate Standing Orders
 */

export interface LegislativeStage {
  /** Machine-readable key stored in DB status field */
  id: string;
  /** Human-readable label shown in UI */
  label: string;
  /** Short description for tooltips / timeline cards */
  desc: string;
  /** 0-based index in the ordered pipeline (not applicable to Discarded) */
  index: number;
}

/** The 9 ordered stages in the Kenyan legislative lifecycle */
export const BILL_STAGES: LegislativeStage[] = [
  { id: 'pre_publication',    label: 'Pre-publication',          desc: 'Bill drafted and gazetted before formal tabling',              index: 0 },
  { id: 'first_reading',      label: 'First Reading',            desc: 'Formal introduction — title read, no debate',                  index: 1 },
  { id: 'second_reading',     label: 'Second Reading',           desc: 'Debate on the general principles and merits of the bill',      index: 2 },
  { id: 'committee_stage',    label: 'Committee Stage',          desc: 'Clause-by-clause scrutiny with public participation',          index: 3 },
  { id: 'report_stage',       label: 'Report Stage',             desc: 'Committee amendments reported back to the House',              index: 4 },
  { id: 'third_reading',      label: 'Third Reading',            desc: 'Final vote — bill passed or rejected as amended',              index: 5 },
  { id: 'presidential_assent',label: 'Presidential Assent',     desc: 'Transmitted to the President for signature',                   index: 6 },
  { id: 'publication',        label: 'Publication (Commencement)', desc: 'Signed bill gazetted — becomes law on commencement date',   index: 7 },
];

/** Special non-sequential state: bill withdrawn or negatived at any stage */
export const DISCARDED_STAGE: LegislativeStage = {
  id: 'discarded',
  label: 'Discarded',
  desc: 'Bill withdrawn, negatived, lapsed, or rejected',
  index: -1,
};

/** All stages including Discarded, for status-color and filter lookups */
export const ALL_STAGES = [...BILL_STAGES, DISCARDED_STAGE];

/** Total number of progression stages (excludes Discarded) */
export const STAGE_COUNT = BILL_STAGES.length; // 8 rectangles

/**
 * Derive a numeric stage index (0–7) from a bill's `status` string.
 * Returns -1 if discarded, or 0 (Pre-publication) as default.
 */
export function getStageIndex(status: string | undefined | null): number {
  if (!status) return 0;
  const s = status.toLowerCase().trim();

  // Discarded at any stage (Strict Match)
  if (s === 'discarded' || s === 'withdrawn' || s === 'negatived' || s === 'rejected' ||
     (s.includes('rejected') && s.includes('reading')) || s === 'failed') {
    return -1;
  }

  if (s.includes('publication') || s.includes('commencement') || s.includes('enacted') ||
      s.includes('law') || s.includes('assented') && s.includes('gaz')) return 7;

  if (s.includes('assent')) return 6;

  if (s.includes('third') || s.includes('3rd')) return 5;

  if (s.includes('report')) return 4;

  if (s.includes('committee')) return 3;

  if (s.includes('second') || s.includes('2nd')) return 2;

  if (s.includes('first') || s.includes('1st') || s.includes('introduction') ||
      s.includes('introduced')) return 1;

  // "Publication" without "commencement" context = Pre-publication
  if (s.includes('pre') || s.includes('publication') || s.includes('gazette') ||
      s.includes('gazet')) return 0;

  return 0; // Default to lowest known stage
}

/**
 * Given a bill's `status` field, return the matching LegislativeStage object.
 */
export function getStageByStatus(status: string | undefined | null): LegislativeStage {
  const idx = getStageIndex(status);
  if (idx === -1) return DISCARDED_STAGE;
  return BILL_STAGES[idx];
}

/**
 * Build a full 9-stage timeline array for a bill, marking completed stages.
 * Handles edge case of fast-tracked bills (same-sitting passage).
 *
 * @param billStatus     - The current `status` field from DB
 * @param dbStages       - The JSON `stages` array from DB (may have dates/descriptions)
 * @param billDate       - The bill's gazette date for Pre-publication completion
 */
export function buildTimeline(
  billStatus: string | undefined | null,
  dbStages: any[] | null,
  billDate?: string | null,
): Array<{
  id: string;
  name: string;
  date: string | null;
  completed: boolean;
  active: boolean;
  discarded: boolean;
  description: string;
}> {
  const currentIdx = getStageIndex(billStatus);
  const isDiscarded = currentIdx === -1;

  // Build a lookup map from the DB stages array (keyed by normalised name)
  const dbMap: Record<string, { date?: string; description?: string }> = {};
  if (Array.isArray(dbStages)) {
    dbStages.forEach((s: any) => {
      const key = (s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      dbMap[key] = { date: s.date, description: s.description };
    });
  }

  const resolveDbStage = (stage: LegislativeStage) => {
    const key = stage.label.toLowerCase().replace(/[^a-z0-9]/g, '');
    return dbMap[key] || dbMap[stage.id.replace(/_/g, '')] || {};
  };

  const timeline = BILL_STAGES.map((stage) => {
    const db = resolveDbStage(stage);
    const isCompleted = !isDiscarded && stage.index <= currentIdx;
    const isActive = !isDiscarded && stage.index === currentIdx;

    // For Pre-publication, use the bill's gazette date as a completion date
    const date = db.date || (stage.index === 0 && isCompleted ? billDate : null) || null;

    return {
      id: stage.id,
      name: stage.label,
      date,
      completed: isCompleted,
      active: isActive,
      discarded: false,
      description: db.description || stage.desc,
    };
  });

  // Append Discarded as the final node if applicable
  if (isDiscarded) {
    // Find which stage it was discarded AT (from DB or guess from context)
    const discardedAtIdx = Math.max(0, currentIdx + 1); // -1 + 1 = 0 default
    // Mark all as not-completed for a discarded bill
    timeline.forEach(t => { t.completed = false; t.active = false; });

    timeline.push({
      id: 'discarded',
      name: DISCARDED_STAGE.label,
      date: null,
      completed: true,
      active: true,
      discarded: true,
      description: DISCARDED_STAGE.desc,
    });
  }

  return timeline;
}

/** Status color classes for badges — maps stage IDs and common status strings */
export function getStageColor(status: string | undefined | null): string {
  const s = (status || '').toLowerCase();
  if (s.includes('discarded') || s.includes('withdrawn') || s.includes('lapsed') ||
      s.includes('negatived') || s.includes('rejected') || s.includes('failed')) {
    return 'bg-red-500/10 text-red-500 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-800/50';
  }
  if (s.includes('assent') || s.includes('publication') || s.includes('enacted') || s.includes('law')) {
    return 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-800/50';
  }
  if (s.includes('third') || s.includes('3rd')) {
    return 'bg-pink-500/10 text-pink-600 border-pink-200 dark:bg-pink-500/20 dark:text-pink-400 dark:border-pink-800/50';
  }
  if (s.includes('report')) {
    return 'bg-violet-500/10 text-violet-600 border-violet-200 dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-800/50';
  }
  if (s.includes('committee')) {
    return 'bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-800/50';
  }
  if (s.includes('second') || s.includes('2nd')) {
    return 'bg-purple-500/10 text-purple-600 border-purple-200 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-800/50';
  }
  if (s.includes('first') || s.includes('1st') || s.includes('introduction')) {
    return 'bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-800/50';
  }
  // Pre-publication / default
  return 'bg-slate-500/10 text-slate-600 border-slate-200 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-800/50';
}
