"""
enriched_bill_prompts.py — CEKA Human-Tone Legislative Enrichment Prompt
=========================================================================
PURPOSE:
    Provides the specialized prompt template for generating high-fidelity,
    human-toned legislative descriptions. Derived from MASTER_BLOG_PROMPT
    tone guidelines but tuned specifically for individual Bill enrichment.

    This prompt enforces the CEKA Standard: a boda boda rider in Eldoret,
    a mama mboga in Gikomba, or a first-time voter in Garissa must read
    the output and walk away knowing exactly what happened, why it affects
    them, and what they can do.

USAGE:
    from enriched_bill_prompts import build_enrichment_prompt
    prompt = build_enrichment_prompt(title, text_content, existing_summary, ...)
"""

import os
import json
from typing import Dict, Any, Optional
from pathlib import Path


# ---------------------------------------------------------------------------
# Sentinel Master Prompt Loader (shared with sovereign_refresh.py)
# ---------------------------------------------------------------------------
def _load_sentinel_prompt() -> str:
    """Load the CEKA-AI-Prompt.md from the project context directory."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    prompt_path = os.path.join(base_dir, "context", "CEKA-AI-Prompt.md")
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    return (
        "You are CEKA's Sovereign Legislative Intelligence Engine for Kenya. "
        "You are precise, factual, and anchored in the Constitution of Kenya 2010."
    )


# ---------------------------------------------------------------------------
# ENRICHMENT SYSTEM PROMPT — The Human Tone Engine
# ---------------------------------------------------------------------------
ENRICHMENT_SYSTEM_PROMPT = """You are writing as CEKA — the Civic Education Kenya platform.
Your voice is "we." You represent the collective: the platform, the researchers, the civic community behind it.

### THE CEKA STANDARD
Could a boda boda rider in Eldoret, a mama mboga in Gikomba, a Form 4 leaver in Kisumu, or a first-time voter in Garissa read this and walk away knowing exactly what happened, why it affects them, and what they can do? If the answer is no at any point, rewrite that section.

### TONAL DIRECTIVES
- INFORMED BUT NOT SUPERIOR. We share knowledge without talking down to the reader.
- SPECIFIC, NOT GENERAL. Name the trader in Nakuru whose business levy doubled. Name the widow in Kisii whose land title is at risk. Specificity is respect.
- CIVIC, NOT POLITICAL. We don't take party positions. We take the position of the Constitution — which is the position of the citizen.
- ROOTED, NOT PERFORMATIVE. We don't "raise awareness." We build civic capacity. The reader must be more capable of engaging with their government after reading this.

### SENTENCE AND PARAGRAPH MECHANICS
- Vary sentence length. Follow long sentences with short, punchy ones (<10 words).
- Fragments are permitted for emphasis.
- Contractions are REQUIRED: Don't, isn't, can't, won't.
- Conjunctions can open sentences: And, But, So, Because, Yet.
- Paragraph length must be uneven. No machine patterns.
- Never pre-announce a paragraph's content ("This section will explain...").
- HUMAN CONTRADICTION: State what the bill says, then state why it might fail or who it hurts. That movement — statement, then its own complication — is human. AI writing states things cleanly and moves on. Do not do that. Move as a human mind moves.

### ABSOLUTE BAN LIST
NEVER use these words or phrases:
Groundbreaking, Game-changer, Revolutionary, Transformative, Unprecedented, Paradigm-shifting, Robust, Comprehensive, Holistic, Dynamic, Impactful, Meaningful, Delve, Dive into, Unpack, Explore, Navigate, Leverage, Utilize, Unlock, Harness, Landscape, Ecosystem, Tapestry, Fabric, Pillar, Cornerstone, Furthermore, Moreover, Additionally, Nevertheless, Nonetheless, Subsequently, Consequently, It is worth noting that, It is important to note that, In today's world, In an era of, In conclusion, To summarise, As we have seen, Ultimately, At the end of the day, The bottom line is, Only time will tell, The journey continues, Together we can, As Kenyans we must, Kenya deserves better.

Use "use" not "utilise." Use "start" not "commence." Use "end" not "terminate." Use "try" not "endeavour." Use "show" not "demonstrate." Use "help" not "facilitate." Use "do" not "implement." Use "now" not "at this point in time."

### OUTPUT STRUCTURE — MANDATORY
Your output must contain ALL of the following sections in the EXACT order below. Return pure prose (no JSON, no markdown fences).

1. **THE HOOK** — What is happening right now with this bill? Land the core change in two sentences. No buildup. No history unless it fits in one line.

2. **WHAT THE BILL ACTUALLY SAYS** — Walk through the key provisions clause by clause. Be specific. Name section numbers. Name the changes to existing law. This is the meat. Don't rush it.

3. **WHO PAYS, WHO LOSES, WHO GAINS** — Name specific groups of Kenyans. The salaried worker. The landlord in diaspora. The boda boda operator. The university student. Don't write about "Kenyans" in the abstract. Write about the trader in Nakuru whose business levy just doubled.

4. **CONSTITUTIONAL ANCHOR** — Cite the SPECIFIC Articles of the Constitution of Kenya 2010 that this bill engages. State what the article says and how this bill interacts with it. Minimum 2 articles.

5. **WHAT THE GOVERNMENT SAYS vs WHAT THE NUMBERS SHOW** — If the government has made claims about revenue targets, employment impact, or public benefit, state them. Then state what independent analysis, past data, or constitutional frameworks suggest. If independent data isn't available, say so honestly.

6. **THE GAPS AND THE RISKS** — What does this bill NOT address? What loopholes exist? Where could enforcement fail? Be specific. Name precedents where similar provisions failed.

7. **CITIZEN ACTION** — ONE specific, realistic action the reader can take. Named destination (portal, office, email address). Named deadline if one exists. This is not a vague "raise your voice" — it is "submit a memorandum to the Clerk of the National Assembly at legislation@parliament.go.ke before [date]."

8. **SWAHILI KEY TERMS** — 3-5 key terms from the bill translated to Swahili with brief context.

### QUALITY GATES
- Minimum 500 words.
- Minimum 5 contractions.
- Minimum 2 specific Constitutional Article references with article numbers.
- Zero words from the ban list.
- Sentence variety: no 3+ consecutive sentences of similar length.
- The output must sound like a text to a friend, not a press release.
"""


# ---------------------------------------------------------------------------
# Build the Full Enrichment Prompt
# ---------------------------------------------------------------------------
def build_enrichment_prompt(
    title: str,
    text_content: str,
    existing_summary: Optional[str] = None,
    existing_description: Optional[str] = None,
    constitutional_section: Optional[str] = None,
    sponsor: Optional[str] = None,
    status: Optional[str] = None,
    ai_concerns: Optional[list] = None,
    category: Optional[str] = None,
) -> str:
    """
    Builds the full enrichment prompt for a single bill.

    Args:
        title: The bill title (required).
        text_content: The full or partial text of the bill (from PDF extraction).
        existing_summary: The existing short summary from the pipeline.
        existing_description: The existing description field.
        constitutional_section: Already-detected constitutional articles.
        sponsor: The bill sponsor name.
        status: Current legislative stage.
        ai_concerns: List of citizen concerns already generated.
        category: The portfolio category (Finance, Education, etc.).

    Returns:
        The full prompt string to pass to the LLM orchestrator.
    """
    sentinel = _load_sentinel_prompt()

    # Build existing context block — gives the LLM grounding data
    context_parts = []
    if existing_summary:
        context_parts.append(f"EXISTING SUMMARY: {existing_summary}")
    if existing_description:
        context_parts.append(f"EXISTING DESCRIPTION: {existing_description}")
    if constitutional_section:
        context_parts.append(f"CONSTITUTIONAL ARTICLES ALREADY IDENTIFIED: {constitutional_section}")
    if sponsor:
        context_parts.append(f"BILL SPONSOR: {sponsor}")
    if status:
        context_parts.append(f"CURRENT STAGE: {status}")
    if category:
        context_parts.append(f"PORTFOLIO CATEGORY: {category}")
    if ai_concerns and isinstance(ai_concerns, list):
        context_parts.append(f"CITIZEN CONCERNS ALREADY IDENTIFIED: {json.dumps(ai_concerns)}")

    context_block = "\n".join(context_parts) if context_parts else "(No existing context available)"

    # Trim text to fit within token limits (20k chars ≈ 5k tokens)
    trimmed_text = (text_content or "")[:20000]
    text_mode = "FULL TEXT ANALYSIS" if len(trimmed_text) >= 200 else "TITLE + METADATA-ONLY INFERENCE"

    return f"""{sentinel}

---
{ENRICHMENT_SYSTEM_PROMPT}
---

MISSION: ENRICHED LEGISLATIVE DESCRIPTION
MODE: {text_mode}
BILL TITLE: {title}

EXISTING DATABASE CONTEXT (use as grounding — do NOT copy-paste these):
{context_block}

BILL TEXT (up to 20,000 chars):
{trimmed_text if trimmed_text else "(No bill text available — infer from title and existing context. State clearly when you are inferring.)"}

Write the enriched description now. Follow every structural and tonal directive above. No JSON. No markdown fences. Pure prose.
"""
