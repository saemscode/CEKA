/**
 * CEKA Nasaka Map Data Worker
 *
 * Scheduled Cloudflare Worker that aggregates heavy geographic / IEBC map data
 * from Supabase Postgres into Cloudflare D1 (edge SQLite) on a cron schedule.
 *
 * Effect: Thousands of frontend map-tile reads hit D1 at the edge (sub-10ms)
 * instead of hitting Supabase Postgres directly, decoupling map rendering
 * performance entirely from Supabase connection-pooler health.
 *
 * Cron schedule: every 30 minutes (configured in wrangler.toml)
 *
 * D1 Schema (run once in Cloudflare Dashboard → D1 → Console):
 *   CREATE TABLE IF NOT EXISTS map_snapshots (
 *     id TEXT PRIMARY KEY,
 *     data TEXT NOT NULL,
 *     updated_at TEXT NOT NULL
 *   );
 *
 * Bindings required in wrangler.toml:
 *   SUPABASE_URL           (secret)
 *   SUPABASE_ANON_KEY      (secret)
 *   CEKA_MAP_DB            (D1 binding)
 */

export interface D1Database {
  prepare(query: string): {
    bind(...args: any[]): any;
    first<T = unknown>(): Promise<T | null>;
    run(): Promise<any>;
    all<T = unknown>(): Promise<{ results: T[] }>;
  };
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface ScheduledEvent {
  cron: string;
  type: string;
  scheduledTime: number;
}

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  CEKA_MAP_DB: D1Database;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ─── MAP DATA SYNC (SCHEDULED) ───────────────────────────────────────────────

async function syncMapDataFromSupabase(env: Env): Promise<void> {
  console.log('[nasaka-map-data] Starting sync from Supabase...');

  // Fetch map/geographic aggregate data from Supabase
  // Adjust the table name and select columns to match your actual schema
  const url = `${env.SUPABASE_URL}/rest/v1/iebc_counties?select=id,name,geojson,population,registered_voters&order=id.asc`;
  const response = await fetch(url, {
    headers: {
      'apikey': env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase map fetch failed: ${response.status} ${response.statusText}`);
  }

  const counties = await response.json();
  const updatedAt = new Date().toISOString();

  // Write aggregated data into D1 as a single snapshot row (upsert by id='latest')
  await env.CEKA_MAP_DB.prepare(
    `INSERT INTO map_snapshots (id, data, updated_at)
     VALUES ('latest', ?, ?)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
  )
    .bind(JSON.stringify(counties), updatedAt)
    .run();

  console.log(`[nasaka-map-data] Sync complete. ${Array.isArray(counties) ? counties.length : 0} counties written at ${updatedAt}`);
}

// ─── FETCH FROM D1 (FRONTEND READ) ──────────────────────────────────────────

async function handleMapDataRead(request: Request, env: Env): Promise<Response> {
  const result = await env.CEKA_MAP_DB.prepare(
    `SELECT data, updated_at FROM map_snapshots WHERE id = 'latest' LIMIT 1`
  ).first<{ data: string; updated_at: string }>();

  if (!result) {
    return new Response(
      JSON.stringify({ error: 'Map data not yet synced. Please try again shortly.' }),
      { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      counties: JSON.parse(result.data),
      updated_at: result.updated_at,
      source: 'd1-edge',
    }),
    {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300', // 5 min CDN cache on top of D1
        'X-Data-Source': 'd1-edge',
      },
    }
  );
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────

export default {
  // Cron trigger: runs on schedule defined in wrangler.toml
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(syncMapDataFromSupabase(env));
  },

  // HTTP fetch handler: serves cached map data to the frontend
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/api/map/counties' && request.method === 'GET') {
      try {
        return await handleMapDataRead(request, env);
      } catch (err: any) {
        console.error('[nasaka-map-data] Read error:', err.message);
        return new Response(
          JSON.stringify({ error: 'Map data unavailable', detail: err.message }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({ status: 'ok', worker: 'nasaka-map-data', timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Manual sync trigger (for admin use — protect this route in production with Access)
    if (url.pathname === '/api/map/sync' && request.method === 'POST') {
      try {
        await syncMapDataFromSupabase(env);
        return new Response(
          JSON.stringify({ status: 'synced', timestamp: new Date().toISOString() }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: 'Sync failed', detail: err.message }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  },
};
