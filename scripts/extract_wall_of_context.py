"""
CEKA Forum - Wall of Context Extractor
Extracts ALL available session context into a single structured Markdown file
ready for LLM post-processing.

Sources:
  1. C:/Users/Administrator/CEKA_LocalCapture/ingested_files/  (all context docs)
  2. C:/Users/Administrator/CEKA_LocalCapture/transcripts/      (partial transcript txt)
  3. C:/Users/Administrator/CEKA_LocalCapture/summaries/        (any summary files)
  4. D:/ceka_sessions.db                                        (primary DB)
  5. C:/Users/Administrator/CEKA_LocalCapture/ingested_files/ceka_sessions.db  (secondary DB)
"""

import sqlite3, os, json
from pathlib import Path
from datetime import datetime

try:
    from docx import Document as DocxDoc
    DOCX_OK = True
except ImportError:
    DOCX_OK = False

try:
    import pdfplumber
    PDF_OK = True
except ImportError:
    PDF_OK = False

# ── Paths ──────────────────────────────────────────────────────────────────────
DATA_DIR    = Path.home() / "CEKA_LocalCapture"
INGEST_DIR  = DATA_DIR / "ingested_files"
TRANS_DIR   = DATA_DIR / "transcripts"
SUMM_DIR    = DATA_DIR / "summaries"
DB_PRIMARY  = Path(r"D:\ceka_sessions.db")
DB_SECONDARY = INGEST_DIR / "ceka_sessions.db"
OUT_FILE    = Path(r"d:\CEKA\ceka v010\CEKA\WALL_OF_CONTEXT.md")

SKIP_FILES = {"ceka_sessions.db"}  # handled separately as DB


def read_text_file(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return f"[READ ERROR: {e}]"


def read_docx(p: Path) -> str:
    if not DOCX_OK:
        return "[python-docx not installed]"
    try:
        doc = DocxDoc(str(p))
        lines = []
        for para in doc.paragraphs:
            if para.text.strip():
                lines.append(para.text)
        # also try tables
        for table in doc.tables:
            for row in table.rows:
                cells = [c.text.strip() for c in row.cells if c.text.strip()]
                if cells:
                    lines.append(" | ".join(cells))
        return "\n".join(lines)
    except Exception as e:
        return f"[DOCX READ ERROR: {e}]"


def read_pdf(p: Path) -> str:
    if not PDF_OK:
        return "[pdfplumber not installed]"
    try:
        with pdfplumber.open(str(p)) as pdf:
            return "\n".join(pg.extract_text() or "" for pg in pdf.pages)
    except Exception as e:
        return f"[PDF READ ERROR: {e}]"


def dump_db(db_path: Path, label: str) -> str:
    if not db_path.exists():
        return f"[Database not found: {db_path}]\n"
    out = []
    try:
        con = sqlite3.connect(str(db_path))
        con.row_factory = sqlite3.Row
        cur = con.cursor()

        # rec_sessions
        out.append("### rec_sessions (Full Recorded Sessions)\n")
        for row in cur.execute("SELECT * FROM rec_sessions"):
            out.append(f"#### Session: {row['title']} | Mode: {row['mode']} | Created: {row['created_at']}")
            out.append(f"- Duration: {row['duration_seconds']}s")
            out.append(f"- Audio Path: {row['audio_path']}")
            out.append("**Full Transcript:**")
            out.append(str(row['transcript_text'] or "None"))
            out.append("**Summary:**")
            out.append(str(row['summary_text'] or "None"))
            out.append("")

        # transcripts
        out.append("### transcripts (Live Chunks)\n")
        for row in cur.execute("SELECT * FROM transcripts ORDER BY ts ASC"):
            out.append(f"[{row['ts']}] [{row['track']}] | {row['session']}")
            out.append(f"> {row['text']}")
            out.append("")

        # analyses
        out.append("### analyses (AI Insights)\n")
        for row in cur.execute("SELECT * FROM analyses ORDER BY ts ASC"):
            out.append(f"[{row['ts']}] [{row['track']}] | {row['session']}")
            out.append(f"- Heard: {row['heard']}")
            out.append(f"- Insight: {row['insight']}")
            out.append(f"- Action: {row['action']}")
            out.append(f"- Watch: {row['watch']}")
            out.append(f"- Raw:\n```\n{row['full_raw']}\n```")
            out.append("")

        # questions
        out.append("### questions (Generated Questions)\n")
        for row in cur.execute("SELECT * FROM questions ORDER BY ts ASC"):
            out.append(f"[{row['ts']}] [{row['tag']}] | {row['session']}")
            out.append(f"> {row['text']}")
            out.append("")

        # documents
        out.append("### documents (Ingested Context Documents)\n")
        for row in cur.execute("SELECT id, filename, filetype, ingested_at, full_text FROM documents"):
            out.append(f"#### Document: {row['filename']} ({row['filetype']}) — Ingested: {row['ingested_at']}")
            out.append(str(row['full_text'] or "[empty]"))
            out.append("")

        con.close()
    except Exception as e:
        out.append(f"[DB ERROR: {e}]")
    return "\n".join(out)


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[CEKA Context Extractor] Starting — {now}")

    sections = []
    sections.append(f"# CEKA FORUM — WALL OF CONTEXT\n")
    sections.append(f"> **Generated:** {now}  \n> **Purpose:** Master LLM context file — all session data, documents, transcripts, analyses, questions.\n")
    sections.append("---\n")

    # ── SECTION 1: Primary DB ──────────────────────────────────────────────────
    sections.append("# SECTION 1: PRIMARY DATABASE (D:\\ceka_sessions.db)\n")
    print(f"  [1/5] Dumping primary DB: {DB_PRIMARY}")
    sections.append(dump_db(DB_PRIMARY, "PRIMARY"))
    sections.append("---\n")

    # ── SECTION 2: Secondary DB ────────────────────────────────────────────────
    sections.append("# SECTION 2: SECONDARY DATABASE (CEKA_LocalCapture/ingested_files/ceka_sessions.db)\n")
    print(f"  [2/5] Dumping secondary DB: {DB_SECONDARY}")
    sections.append(dump_db(DB_SECONDARY, "SECONDARY"))
    sections.append("---\n")

    # ── SECTION 3: Ingested Context Documents ──────────────────────────────────
    sections.append("# SECTION 3: INGESTED CONTEXT DOCUMENTS (CEKA_LocalCapture/ingested_files/)\n")
    print(f"  [3/5] Extracting ingested_files: {INGEST_DIR}")
    if INGEST_DIR.exists():
        for f in sorted(INGEST_DIR.iterdir()):
            if f.name in SKIP_FILES or not f.is_file():
                continue
            ext = f.suffix.lower()
            print(f"    -> {f.name}")
            sections.append(f"## Context Document: {f.name}\n")
            sections.append(f"- Path: `{f}`\n- Type: `{ext}`\n- Size: `{f.stat().st_size / 1024:.1f} KB`\n")
            sections.append("**Content:**\n")
            if ext in {".txt", ".md", ".csv", ".json", ".py", ".ts", ".js"}:
                sections.append(read_text_file(f))
            elif ext == ".docx":
                sections.append(read_docx(f))
            elif ext == ".pdf":
                sections.append(read_pdf(f))
            else:
                sections.append(f"[Unsupported file type: {ext}]")
            sections.append("\n---\n")
    else:
        sections.append(f"[Directory not found: {INGEST_DIR}]\n")

    # ── SECTION 4: Partial Transcript Files ───────────────────────────────────
    sections.append("# SECTION 4: TRANSCRIPT FILES (CEKA_LocalCapture/transcripts/)\n")
    print(f"  [4/5] Extracting transcripts: {TRANS_DIR}")
    if TRANS_DIR.exists():
        for f in sorted(TRANS_DIR.iterdir()):
            if not f.is_file():
                continue
            print(f"    -> {f.name}")
            sections.append(f"## Transcript File: {f.name}\n")
            sections.append(read_text_file(f))
            sections.append("\n---\n")
    else:
        sections.append(f"[Directory not found: {TRANS_DIR}]\n")

    # ── SECTION 5: Summary Files ───────────────────────────────────────────────
    sections.append("# SECTION 5: SUMMARY FILES (CEKA_LocalCapture/summaries/)\n")
    print(f"  [5/5] Extracting summaries: {SUMM_DIR}")
    if SUMM_DIR.exists():
        found = list(SUMM_DIR.iterdir())
        if not found:
            sections.append("*[No summary files found — summaries directory is empty.]*\n")
        for f in sorted(found):
            if not f.is_file():
                continue
            print(f"    -> {f.name}")
            sections.append(f"## Summary File: {f.name}\n")
            sections.append(read_text_file(f))
            sections.append("\n---\n")
    else:
        sections.append(f"[Directory not found: {SUMM_DIR}]\n")

    # ── Write output ───────────────────────────────────────────────────────────
    full_content = "\n".join(sections)
    OUT_FILE.write_text(full_content, encoding="utf-8")
    size_kb = OUT_FILE.stat().st_size / 1024
    print(f"\n[DONE] Wall of Context written to: {OUT_FILE}")
    print(f"       Total size: {size_kb:.1f} KB ({size_kb/1024:.2f} MB)")


if __name__ == "__main__":
    main()
