# CEKA FORUM HISTORY — FULL REPORT
**Source document:** `FULL_FORUM_HISTORY.md` (export of `ceka_sessions.db`, CEKA_LocalCapture pipeline)
**Companion file:** `RESTRUCTURED.md` — the same content, unabridged, regrouped by category

---

## 1. What this data actually is

This is not one meeting — it's two unrelated capture sessions that share the same
database `session` label ("Forum Session 1"), plus a separate document-ingestion log:

| Segment | Date | What it is | Chunks | Analyses | Questions |
|---|---|---|---|---|---|
| **A — Bitcoin/Crypto** | 18–19 June 2026 | Live ASR + local-LLM analysis of a forum/meeting where Bitcoin, Lightning, and Nostr came up | 592 | 592 | ~136 |
| **B — TFGBV/COVAW prep** | 15 July 2026 | Live ASR + analysis of prep for the COVAW/UNFPA MASS coordination meeting (the same meeting the ingested `TFGBV (Internal Prep) Doc` was written for) | 993 | 292 | ~649 |
| **System log** | 18 Jun – 15 Jul | Pinggy tunnel connections, audio-input warnings from the capture host | 45 | – | – |
| **Full recorded transcript** | 15 Jul 2026 | A separate ~65-minute diarized meeting recording (7 speaker IDs), heavily garbled | 1 session | – | – |
| **Ingested documents** | 14–15 Jul 2026 | RAG store: the TFGBV prep brief, two e2e test pings, and the full Kenyan Constitution text (ingested twice each) | 6 docs | – | – |

The tool behind this is CEKA's local capture app: it transcribes a live mic feed,
tags each chunk with a topic, sends it to a local Ollama model for a
Heard/Insight/Action/Watch analysis plus generated follow-up questions, and
separately runs a RAG ingestion pipeline over uploaded documents.

---

## 2. Data quality — read this before trusting anything in Part A/B verbatim

**The transcript text is not reliable ASR.** Spot-checking both segments against
the raw chunks, the speech-to-text output is heavily garbled — plausible-sounding
sentences that don't track as coherent speech ("Bitcoin's protocol... unlike notes,
they're not deletable and persist across chains, even in private contexts like
flights"; "Btika.kv.kv" for what's likely a real platform name mis-transcribed).
Treat every direct quote in Parts A/B of the restructured file as **approximate**,
not verbatim — especially anything with a name, number, or platform name in it.

**The AI-analysis pipeline was largely broken during the Bitcoin segment and
healthy during the TFGBV segment:**

- **Segment A (Bitcoin, 18 Jun):** only **52/592 analyses (8.8%)**
  produced a real insight. 21 failed with an explicit Ollama HTTP timeout
  (`read timeout=90`); the remaining ~500 returned `[no response]` with no error
  logged — the local model was silently not responding, most likely overloaded or
  crashed partway through the session, and nobody appears to have noticed live.
- **Segment B (TFGBV, 15 Jul):** **290/292 analyses (99.3%)**
  produced a real insight, zero explicit errors. Whatever broke on 18 June was
  fixed or avoided by 15 July.

**Chunk-level duplication:** 592 Bitcoin chunks include 40
exact-duplicate texts, and the TFGBV segment's 993 chunks include 74 exact
duplicates — both consistent with overlapping capture windows re-transcribing the
same few seconds of audio, not with the meeting actually repeating itself.

**Document ingestion:** `ceka_e2e_test.txt` and `constitution_full_text.txt` were
each ingested twice (14:23 and 19:46 for the test file; 03:29 and 03:31 for the
constitution) — both re-ingestions produced byte-identical content, so this reads
as a retry or duplicate-run rather than a content update. `ceka_sessions.db`
itself was also logged as an "ingested document" but is unsupported for text
extraction, so it contributed nothing to the RAG store.

**The infrastructure log (Part C) shows an exposed local dev server.** Between
04:10 and 17:04 on 15 July, Pinggy repeatedly opened remote-forward tunnels to
`127.0.0.1:5000` on the capture host, with several reconnects, a forced
termination, and a "Time exceeded" cutoff after a ~10,235-second (2.8-hour)
session. If `127.0.0.1:5000` is the capture app's own local server, this means it
was being tunneled to the public internet via Pinggy's free relay for an extended
window during the TFGBV prep session — worth confirming that was intentional and
that nothing sensitive was reachable on that port during that window.

---

## 3. Segment A — Bitcoin/Crypto discussion (18–19 June 2026): what it was actually about

Of the 52 real insights generated, the discussion clusters around a
recurring set of threads (see `RESTRUCTURED.md` Part A.2 for every raw entry):

- **A platform referred to as "BT" / "Btika"** — the ASR is inconsistent on the
  name (also renders as "Btika.kv.kv") — described as something Kenyans could use
  to buy/sell Bitcoin, with the model repeatedly guessing at its purpose since the
  transcript never clearly states it.
- **Lightning Network** came up specifically around fee structure (fees deducted
  from the sender, not the recipient — consistent across "wallet apps like
  Blink"), transaction expiry, and privacy versus on-chain Bitcoin.
- **Nostr / Fedi** was raised as a decentralized, censorship-resistant layer for
  civic communication, repeatedly framed as complementary to CEKA's existing
  Supabase Realtime chat — with the analyses flagging this as a possible
  Supabase→Nostr migration question, which also shows up directly in the
  generated-questions list ("Migration from Supabase Realtime to Nostr relays —
  can both run in parallel?").
- **Recurring risk/watch flags**: regulatory ambiguity, user education gaps,
  volatility for operational budgets, and the general tension between Bitcoin's
  pseudonymity being useful for activism but also a liability for uninitiated
  users.
- A non-trivial share of "insights" are the model correctly flagging that a
  chunk was too garbled or off-topic to analyze (slang, meme references, or
  clearly mistranscribed audio) — a sign the model was doing reasonable
  uncertainty-handling even when the input was bad.

---

## 4. Segment B — TFGBV / COVAW meeting prep (15 July 2026): what it was actually about

This segment tracks closely with the ingested `TFGBV (Internal Prep) Doc` (see
Part D of `RESTRUCTURED.md` for its full text) — a detailed OSINT-style briefing
prepared ahead of the COVAW-convened MASS Partnership & Coordination Meeting.
Key facts from that brief, for context on what the live discussion was reacting
to:

- **Meeting:** 15 July 2026, Ibis Styles Hotel Westlands, convened by COVAW under
  UNFPA's Making All Spaces Safe (MASS) programme (funded by Global Affairs
  Canada, CAD$5M/USD$3.6M; Kenya and Benin are the only two pilot countries).
- **CEKA's assigned role in the room:** the only civic-legislative-literacy org
  present — not a GBV service provider — with a mandate to leave with named
  contacts and a concrete next step per institution, prioritizing COVAW's
  Executive Director Fridah Wawira Nyaga, KICTANet, and UN Women Kenya's DPGG.
- **Prevalence data cited:** ~90% of young adults in Nairobi tertiary
  institutions have witnessed TFGBV, 39% experienced it personally; ~28% of women
  regionally report online violence; femicide counts are contested across three
  different methodologies (police-recorded, media-tracked, cumulative).

The live-session analyses (Part B.2) track a mostly separate register from the
brief — heavier on real-time reactions to what was being said in the room
(patriarchal norms silencing male victims, journalists as TFGBV allies,
inter-agency "thank you" acknowledgments, closing-session logistics) than on the
brief's OSINT specifics. The consistent thread across almost all 290
insights is the model repeatedly reasserting **CEKA's positioning**: legislative
tracking + constitutional literacy + tech-enabled civic education as CEKA's
distinct value in the TFGBV space, tied back to the Sexual Offences Act (2006)
and the MASS programme specifically. That repetition is worth noting as a
pattern in the model's output, not necessarily as 290 independently
arrived-at insights — the same 3–4 "CEKA's legislative/constitutional
positioning" framing recurs many times with only surface rewording.

The generated-questions table for this segment breaks down as: 417 tagged
`tfgbv`, 90 `partnership`, 71 `legal`,
71 `funding`, 51 `general`,
96 `ceka` — full deduplicated lists are in `RESTRUCTURED.md`
Part B.3.

---

## 5. Part E — the separate full recorded transcript

The standalone ~65-minute diarized recording (7 speaker IDs, timestamped
[00:00]–[63:26]) is the most heavily garbled artifact in the whole dump — large
gaps between timestamps (e.g. [00:41] to [08:15], [36:17] to [45:19]) suggest
either silence, non-speech audio, or dropped segments rather than a continuous
transcript. What is legible tracks a civic/human-rights meeting: mentions of
"community guidelines," "digital rights as human rights," a reference to
"Starbark" as a "partner office," and a speaker explicitly raising whether
digital rights are recognized in "our universal declaration." No `Summary` was
generated for this recording (`summary_text` field is empty in the source). This
reads as the same underlying 15 July meeting/prep context as Segment B, captured
through a different, lower-fidelity pipeline (full-session diarization vs.
live chunked ASR).

---

## 6. Recommendations

1. **Don't cite Segment A specifics (platform names, numbers, wallet names)
   without independent verification** — the ASR garbling is severe and the AI
   layer was non-functional for ~91% of that segment.
2. **Investigate the 18 June Ollama outage.** ~500 silent `[no response]`
   analyses with zero error logging is a monitoring gap — the pipeline should
   distinguish "model didn't respond" from "model responded but had nothing to
   say" and alert on the former.
3. **Confirm the Pinggy tunnel exposure on 15 July was intentional.** A
   multi-hour public tunnel to a local port during a session ingesting sensitive
   TFGBV survivor-prevalence data and internal partnership strategy is worth a
   deliberate yes/no, not an assumption.
4. **The TFGBV prep document (Part D.1) is the highest-signal artifact in this
   entire dump** — it's structured, sourced, and actionable in a way nothing else
   here is. If a report is needed for the actual COVAW meeting follow-up, that
   document — not the live-session chunks — is the primary source.
5. **Question dedup is worth doing at generation time, not after.** 977
   raw question rows collapsed to far fewer unique ones once deduplicated
   (see `RESTRUCTURED.md` A.3/B.3) — the generator appears to be re-emitting the
   same question set every few seconds rather than only on new triggers.
