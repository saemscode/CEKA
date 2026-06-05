/**
 * CEKA Supabase Cache Worker (BFF — Backend for Frontend)
 *
 * This Worker intercepts high-traffic Supabase REST requests and serves them
 * from Cloudflare's Edge Cache. The donations total route, which previously
 * generated thousands of database hits per minute from frontend polling,
 * is reduced to at most 1 Supabase query per 60-second cache window globally.
 *
 * Routes:
 *   GET /api/donations/total      → Cached donation total (60s TTL)
 *   POST /api/cache/purge         → Admin cache invalidation (requires X-Cache-Secret header)
 *   GET  /api/health              → Worker health check
 *
 * Bindings required in wrangler.toml:
 *   SUPABASE_URL          (secret)
 *   SUPABASE_ANON_KEY     (secret)
 *   CACHE_PURGE_SECRET    (secret)
 */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  CACHE_PURGE_SECRET: string;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cache-Secret',
};

const CACHE_TTL_SECONDS = 60;

// ─── DONATION TOTAL ──────────────────────────────────────────────────────────

async function fetchDonationTotalFromSupabase(env: Env): Promise<number> {
  const url = `${env.SUPABASE_URL}/rest/v1/transactions?select=amount&status=eq.success`;
  const response = await fetch(url, {
    headers: {
      'apikey': env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase fetch failed: ${response.status} ${response.statusText}`);
  }

  const rows: Array<{ amount: number }> = await response.json();
  return rows.reduce((sum, row) => sum + (row.amount || 0), 0);
}

async function handleDonationTotal(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const cache = (caches as any).default;
  // Stable cache key — same response served to all users for 60 seconds
  const cacheKey = new Request('https://cache.ceka.internal/donations-total-v1', {
    method: 'GET',
  });

  // L1: Check edge RAM
  const cached = await cache.match(cacheKey);
  if (cached) {
    const body = await cached.json() as { total: number; cached_at: string };
    return new Response(
      JSON.stringify({ total: body.total, cached_at: body.cached_at, source: 'edge-cache' }),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'X-Cache-Status': 'HIT',
          'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}`,
        },
      }
    );
  }

  // L2: Cache miss — fetch from Supabase
  const total = await fetchDonationTotalFromSupabase(env);
  const now = new Date().toISOString();
  const payload = JSON.stringify({ total, cached_at: now, source: 'supabase' });

  const responseToCache = new Response(payload, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}`,
    },
  });

  // Store in edge cache without blocking the response to the user
  ctx.waitUntil(cache.put(cacheKey, responseToCache.clone()));

  return new Response(payload, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'X-Cache-Status': 'MISS',
      'Cache-Control': `public, s-maxage=${CACHE_TTL_SECONDS}`,
    },
  });
}

// ─── CACHE PURGE ─────────────────────────────────────────────────────────────

async function handleCachePurge(request: Request, env: Env): Promise<Response> {
  const secret = request.headers.get('X-Cache-Secret');
  if (!secret || secret !== env.CACHE_PURGE_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const cache = (caches as any).default;
  const cacheKey = new Request('https://cache.ceka.internal/donations-total-v1', { method: 'GET' });
  await cache.delete(cacheKey);

  return new Response(JSON.stringify({ status: 'purged', timestamp: new Date().toISOString() }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({ status: 'ok', worker: 'supabase-cache', timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Donation total — primary cached route
    if (url.pathname === '/api/donations/total' && request.method === 'GET') {
      try {
        return await handleDonationTotal(request, env, ctx);
      } catch (err: any) {
        console.error('[supabase-cache] Donation total error:', err.message);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch donation total', detail: err.message }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Admin cache purge
    if (url.pathname === '/api/cache/purge' && request.method === 'POST') {
      return handleCachePurge(request, env);
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  },
};
