"""
CEKA Forum - Master Context Merger
Combines ALL extracted data into a single MASTER_CONTEXT.md:
  - FULL_FORUM_HISTORY.md    (DB: live chunks, analyses, questions, rec_sessions)
  - WALL_OF_CONTEXT.md       (all context docs: Constitution, TFGBV prep doc, secondary DB)
  - AUDIO_TRANSCRIPT_GROQ.md (whisper-large-v3 full audio transcript, 730 segments)

Output: d:/CEKA/ceka v010/CEKA/MASTER_CONTEXT.md
"""

from pathlib import Path
from datetime import datetime

BASE   = Path(r"d:\CEKA\ceka v010\CEKA")
OUT    = BASE / "MASTER_CONTEXT.md"

SOURCES = [
    {
        "label":   "PART 1: FULL FORUM DATABASE HISTORY",
        "desc":    "All live AI-captured chunks, analyses, generated questions, and recorded session transcripts from ceka_sessions.db",
        "file":    BASE / "FULL_FORUM_HISTORY.md",
    },
    {
        "label":   "PART 2: WALL OF CONTEXT — INGESTED DOCUMENTS & SECONDARY DATABASE",
        "desc":    "All documents loaded into the forum RAG engine: Kenya Constitution full text, TFGBV Internal Prep Doc (COVAW invite), ceka_e2e_test, secondary DB dump, partial transcript files.",
        "file":    BASE / "WALL_OF_CONTEXT.md",
    },
    {
        "label":   "PART 3: FULL AUDIO TRANSCRIPT — whisper-large-v3 via Groq",
        "desc":    "Complete verbatim transcript of the 119 MB forum recording (65+ minutes). 730 timestamped segments. Language auto-detected (English/Swahili). Transcribed at 189x real-time via Groq Cloud.",
        "file":    BASE / "AUDIO_TRANSCRIPT_GROQ.md",
    },
]


def main():
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print("=" * 70)
    print("  CEKA Forum - Master Context Merger")
    print(f"  Started: {now}")
    print("=" * 70)

    total_chars = 0

    with OUT.open("w", encoding="utf-8") as out_f:
        # Master header
        out_f.write("# CEKA FORUM — MASTER CONTEXT\n\n")
        out_f.write(f"> **Generated:** {now}  \n")
        out_f.write("> **Purpose:** Complete, merged intelligence document from the COVAW MASS TFGBV Forum (15 July 2026).  \n")
        out_f.write("> **Contents:** Live AI analyses | Generated questions | Full audio transcript (whisper-large-v3) | Kenya Constitution | TFGBV Prep Doc | All RAG context  \n")
        out_f.write("> **Next Step:** Feed into LLM for synthesis, summary, and strategic reporting.\n\n")
        out_f.write("---\n\n")

        # Table of contents
        out_f.write("## TABLE OF CONTENTS\n\n")
        for i, s in enumerate(SOURCES, 1):
            out_f.write(f"{i}. [{s['label']}](#{s['label'].lower().replace(' ','-').replace(':','').replace('/','-').replace('(','').replace(')','')})\n")
        out_f.write("\n---\n\n")

        for s in SOURCES:
            label   = s["label"]
            desc    = s["desc"]
            src     = s["file"]

            print(f"\n  Merging: {src.name}")

            out_f.write(f"# {label}\n\n")
            out_f.write(f"> {desc}\n\n")

            if not src.exists():
                msg = f"[FILE NOT FOUND: {src}]"
                out_f.write(msg + "\n\n")
                print(f"    [WARN] {msg}")
                continue

            content = src.read_text(encoding="utf-8", errors="replace")
            # Strip the inner title header from each source to avoid duplication
            lines   = content.splitlines()
            # Skip the first H1 line if it exists (we replace with our section header above)
            if lines and lines[0].startswith("# "):
                lines = lines[1:]
            cleaned = "\n".join(lines)

            out_f.write(cleaned)
            out_f.write("\n\n---\n\n")

            chars = len(cleaned)
            total_chars += chars
            size_kb = src.stat().st_size / 1024
            print(f"    -> {size_kb:.1f} KB merged ({chars:,} chars)")

    out_size   = OUT.stat().st_size
    out_size_kb = out_size / 1024
    out_size_mb = out_size / (1024 * 1024)

    print("\n" + "=" * 70)
    print(f"  MASTER CONTEXT COMPLETE")
    print(f"  Output : {OUT}")
    print(f"  Size   : {out_size_kb:.1f} KB  ({out_size_mb:.2f} MB)")
    print(f"  Chars  : {total_chars:,}")
    print(f"  Est. tokens (GPT-4 ~4ch/tok): ~{total_chars//4:,}")
    print("=" * 70)

    # Print a summary line suitable for next-step prompt
    print(f"\n  NEXT STEP: Load MASTER_CONTEXT.md into your LLM of choice and prompt:")
    print(f"  'You are analyzing the complete proceedings of the COVAW MASS TFGBV Forum,")
    print(f"   Nairobi, 15 July 2026. Using the full document below, produce: (1) Executive")
    print(f"   Summary, (2) Key Outcomes & Decisions, (3) CEKA Strategic Action Items,")
    print(f"   (4) All Questions Raised, (5) Funding Opportunities Identified.'")


if __name__ == "__main__":
    main()
