# CEKA News Intelligence Engine

Additive module. Nothing here renames, drops, or modifies any existing
CEKA table, script, or component. `multi_llm_orchestrator.py` is
imported directly, not duplicated - drop your existing copy of that
file into this same directory (or put this directory on `PYTHONPATH`
alongside it).

## What I could not verify against your live repo

I do not have shell/file access to your actual CEKA codebase in this
conversation - only the four files you pasted in
(`deep_intelligence_relay.py`, the wayback crawler,
the enhanced legislative scraper, `multi_llm_orchestrator.py`).
Two integration points follow from that limitation and need your
confirmation before this runs unattended:

1. **`ProxyPool`**: your legislative scraper's `ProxyPool` class exists
   because `parliament.go.ke`'s bill PDF portal sits behind Cloudflare.
   `news_collector.py` does not duplicate that class - I don't know
   its current file path in your repo, and guessing would risk a
   second, drifting copy of the same logic. Instead, set
   `PROXY_POOL_MODULE=<your_scraper_filename_without_.py>` as an env
   var and the collector will import and use your real `ProxyPool` if
   that module exposes one. Without it, collection runs direct
   (no proxy) - fine for RSS and for the official `.go.ke` sources
   listed below, since none of them showed Cloudflare behavior in
   testing. If one turns out to need it, that's the signal to wire
   the env var in.

2. **`SupabaseDirect`**: `deep_intelligence_relay.py` imports a
   `supabase_direct.SupabaseDirect` wrapper whose method signatures I
   don't have. Every file here uses the standard `supabase-py`
   `create_client` instead, which I know precisely. If you'd rather
   standardize on your `SupabaseDirect` wrapper, the `SupabaseStore` /
   `SupabaseSink` classes in each file are the only places that would
   need to change - the rest of each pipeline is independent of which
   client wrapper does the I/O.

## Embedding model - one correction against the original brief

`text-embedding-004` and `models/embedding-001` are deprecated. This
module uses `gemini-embedding-001` (via the `google-genai` package,
separate from your existing `google-generativeai` import - both
coexist fine) with `output_dimensionality=768` and manual L2
normalization, which Google's current docs require for any dimension
other than the native 3072. Local fallback is
`sentence-transformers/all-mpnet-base-v2`, also native 768-dim, no API
key required.

## Environment variables

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY       # collection, enrichment, fusion, headlines, feed synthesis
SUPABASE_ANON_KEY               # news_feed_api.py only
CEKA_GEMINI_API_KEY             # or GEMINI_API_KEY / VITE_GEMINI_API_KEY - embeddings + generation
# plus every provider key your existing multi_llm_orchestrator.py already reads
# (ANTHROPIC_API_KEY, CEKA_GROQ_API_KEY, DEEPSEEK_API_KEY, CEREBRAS_API_KEY, etc.)

PROXY_POOL_MODULE=               # optional, see above
ENRICHMENT_MAX_SIGNALS_PER_RUN=100
FUSION_MAX_SIGNALS_PER_RUN=150
HEADLINE_MAX_NIOS_PER_RUN=60
FEED_SIZE=8
FEED_MAX_PER_TOPIC=2
FEED_REFRESH_MINUTES=10
FEED_API_CORS_ORIGINS=https://civiceducationkenya.com
```

## Setup

```bash
pip install -r requirements.txt --break-system-packages
psql "$SUPABASE_DB_URL" -f schema_news_intelligence.sql
python news_sources.py          # seeds news_sources and writes news_sources.json
python run_news_pipeline.py     # one full pass: collect -> enrich -> fuse -> headline -> synthesize feed
uvicorn news_feed_api:app --host 0.0.0.0 --port 8000   # serve /feed and /nio/{id}
```

## Cron cadence (GitHub Actions, matching your existing pattern)

| Stage | Script | Suggested interval |
|---|---|---|
| Collection | `news_collector.py` | every 5-10 min |
| Enrichment | `news_enrichment.py` | every 10-15 min |
| Fusion | `news_fusion_relay.py` | every 10-15 min, after enrichment |
| Headlines | `news_headline_engine.py` | every 15-20 min |
| Feed synthesis | `news_feed_synthesis.py` | every 5-10 min |

Or point one cron at `run_news_pipeline.py` for a single combined run
if independent cadences aren't worth the extra workflow files yet.

## What is deterministic vs. LLM-driven

Deterministic (no model call, no variance run to run): corroboration
confidence (noisy-OR over distinct source credibility weights),
velocity, importance, state transitions, headline candidate scoring,
feed selection and per-topic capping.

LLM-driven (via your existing `MultiLLMOrchestrator`, same provider
cascade you already run for bills): story DNA / entity / claim
extraction, ambiguous-match disambiguation (cosine 0.75-0.90 band
only), headline candidate generation, summary generation.

## Files

- `schema_news_intelligence.sql` - additive schema, RLS, `public_nios` view
- `news_sources.py` - tiered source registry (real domains, run to seed the table)
- `embedding_engine.py` - Gemini + local fallback, 768-dim
- `news_collector.py` - Stage 1: RSS + direct HTML collection into `signals`
- `news_enrichment.py` - Stage 2: story DNA / entities / claims / embeddings
- `news_fusion_relay.py` - Stage 3-5: matching, corroboration, state machine, decay
- `news_headline_engine.py` - Stage 6: canonical headline + summaries
- `news_feed_synthesis.py` - Stage 7: ranks and writes `feed_snapshot`
- `news_feed_api.py` - Stage 8: the two read endpoints the frontend calls
- `run_news_pipeline.py` - single-cron entrypoint running all stages in order
