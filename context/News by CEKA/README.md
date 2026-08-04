# CEKA News Intelligence Engine

Run `migration_v2_real_schema.sql`. Ignore `schema_news_intelligence.sql`
(kept only so the earlier turn isn't silently erased - it's marked
superseded at the top and creates nothing you should actually run).

## Why v2 looks different from the first draft

The first draft was written without seeing your actual database. Once
`backup.sql` was available, three of the four "new" tables I'd
designed turned out to already exist under different names:

| First draft (wrong) | Real table (what's actually used now) |
|---|---|
| `news_sources` | `scraper_sources`, extended with `tier`, `source_type`, `credibility_weight`, `domain` |
| `signals` | `bill_news_mentions`, extended with `source_id`, `clean_content`, `embedding`, `story_dna`, `entities`, `claims`, `matched_nio_id`, `enrichment_status`, `fusion_status`; `bill_id` relaxed to nullable |
| `feed_snapshot` | `trending_cache`, given the public-read RLS policy it was missing (RLS was enabled with zero policies - unreadable by anon/authenticated until this migration) |
| `pipeline_locks` | already existed, unchanged, just reused |

Only `nios` and `nio_relations` are genuinely new tables - nothing in
your schema modeled a cross-source, cross-bill event before this.

Existing rows in `bill_news_mentions` (all bill-tied, from your
current legislative scraper) are backfilled to `fusion_status='fused'`
in the migration, so the frontend's `fusion_status = 'fused'` filter
doesn't hide news that's already live on the site.

## What I could not verify against your live repo

I still don't have shell access to your actual frontend/backend repo -
only what you've pasted into this conversation (`backup.sql`, four
Python pipeline files, and three React components). Two integration
points depend on files I don't have:

1. **`ProxyPool`**: your legislative scraper's Cloudflare-bypass class.
   `news_collector.py` imports it via `PROXY_POOL_MODULE` env var if
   you set one; otherwise it runs direct. None of the RSS feeds or
   `.go.ke` official pages in `news_sources.py` showed Cloudflare
   behavior in testing, so this is opt-in, not required.
2. **`useCivicPlayerData` / `useCivicPlayerStore`**: `CivicMiniPlayer.tsx`
   imports these but their source wasn't provided, so I've specified
   (not guessed at) what they need to change - see
   `FRONTEND_INTEGRATION.md`.

## Embedding model and dimension

`gemini-embedding-001` (the `google-genai` package, separate from your
existing `google-generativeai` import - both coexist fine) at
`output_dimensionality=768`, with the manual L2 normalization Google's
docs require for any dimension other than the native 3072. This
matches `discussions.embedding vector(768)`, the one vector column in
your database that already has a real `hnsw` index behind it -
`document_embeddings.embedding` is `vector(1536)` but unindexed, so
768 was the better convention to extend, not 1536. Local fallback is
`sentence-transformers/all-mpnet-base-v2`, also native 768-dim.

## Environment variables

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY       # collection, enrichment, fusion, headlines, feed synthesis
SUPABASE_ANON_KEY               # news_feed_api.py only
CEKA_GEMINI_API_KEY             # or GEMINI_API_KEY / VITE_GEMINI_API_KEY - embeddings + generation
# plus every provider key your existing multi_llm_orchestrator.py already reads

PROXY_POOL_MODULE=               # optional, see above
ENRICHMENT_MAX_SIGNALS_PER_RUN=100
FUSION_MAX_SIGNALS_PER_RUN=150
HEADLINE_MAX_NIOS_PER_RUN=60
FEED_SIZE=8
FEED_MAX_PER_TOPIC=2
FEED_API_CORS_ORIGINS=https://civiceducationkenya.com
```

## Setup

```bash
pip install -r requirements.txt --break-system-packages
psql "$SUPABASE_DB_URL" -f migration_v2_real_schema.sql
python news_sources.py          # seeds scraper_sources, writes news_sources.json
python run_news_pipeline.py     # one full pass: collect -> enrich -> fuse -> headline -> sync trending_cache
uvicorn news_feed_api:app --host 0.0.0.0 --port 8000   # optional - see note in news_feed_api.py
```

## Cron cadence

| Stage | Script | Suggested interval |
|---|---|---|
| Collection | `news_collector.py` | every 5-10 min |
| Enrichment | `news_enrichment.py` | every 10-15 min |
| Fusion | `news_fusion_relay.py` | every 10-15 min, after enrichment |
| Headlines | `news_headline_engine.py` | every 15-20 min |
| Feed sync | `news_feed_synthesis.py` | every 5-10 min |

Or point one cron at `run_news_pipeline.py` for a combined run.

## Deterministic vs. LLM-driven

Deterministic: corroboration confidence (noisy-OR over distinct source
credibility weights), velocity, importance, state transitions,
headline candidate scoring, feed selection and per-topic capping.

LLM-driven (via your existing `MultiLLMOrchestrator`, same provider
cascade you already run for bills): story DNA / entity / claim
extraction, ambiguous-match disambiguation (cosine 0.75-0.90 band
only), headline candidate generation, summary generation.

## Files

- `migration_v2_real_schema.sql` - run this one
- `schema_news_intelligence.sql` - superseded, do not run
- `news_sources.py` - tiered source registry, seeds `scraper_sources`
- `embedding_engine.py` - Gemini + local fallback, 768-dim
- `news_collector.py` - Stage 1: RSS + direct HTML into `bill_news_mentions`
- `news_enrichment.py` - Stage 2: story DNA / entities / claims / embeddings
- `news_fusion_relay.py` - Stage 3-5: matching, corroboration, state machine, decay
- `news_headline_engine.py` - Stage 6: canonical headline + summaries
- `news_feed_synthesis.py` - Stage 7: syncs top NIOs into `trending_cache`
- `news_feed_api.py` - Stage 8: optional read API (frontend can query Supabase directly instead)
- `run_news_pipeline.py` - single-cron entrypoint running all stages in order
- `FRONTEND_INTEGRATION.md` - the (a) part of your question: concrete patch for `LegislativeTracker.tsx`, spec for the miniplayer hook
