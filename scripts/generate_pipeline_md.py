import os
from pathlib import Path

# Paths to the scripts in chronological order
PIPELINE_SCRIPTS = [
    {
        "title": "Phase 1: Raw Extraction (PDF/CSV to Structured CSV)",
        "desc": "Extracts tabular data from the official raw 290 PDF utilizing heuristics and column structure matching.",
        "path": r"d:\CEKA\ceka v010\CEKA\scripts\relentless_extractor.py"
    },
    {
        "title": "Phase 2: Data Cleaning & Normalization",
        "desc": "Normalizes constituency names, formats distances, separates landmark types, and prepares the core geocoding input standard.",
        "path": r"d:\CEKA\ceka v010\CEKA\scripts\geocode_pipeline\clean_addresses.py"
    },
    {
        "title": "Phase 3: Deep 7-Layer Geocoding Engine",
        "desc": "The primary geocoding powerhouse. Uses Google Maps API through 7 sequential fallback layers to pinpoint locations based on names, landmarks, and distances.",
        "path": r"d:\CEKA\ceka v010\CEKA\scripts\geocode_pipeline\geocode_addresses.py"
    },
    {
        "title": "Phase 4: RAG Deep-Context Geocoding (Resilience Layer)",
        "desc": "Mops up unresolved entities by feeding local context into DeepSeek/OpenAI LLM to infer precise coordinates.",
        "path": r"d:\CEKA\ceka v010\CEKA\scripts\geocode_pipeline\geocoding_with_rag.py"
    },
    {
        "title": "Phase 5: Atomic Code Sync & Deduplication",
        "desc": "Ensures all 290 constituencies are perfectly mapped to their official numeric IDs, recovering any malformed strings and ensuring absolute relational integrity.",
        "path": r"d:\CEKA\ceka v010\CEKA\scripts\geocode_pipeline\atomic_code_sync_v5.py"
    },
    {
        "title": "Phase 6: The Ultimate Ingestion (Supabase Push)",
        "desc": "The final stage. Upserts the perfectly validated 290 dataset into the production public.iebc_offices database with military-grade error handling.",
        "path": r"d:\CEKA\ceka v010\CEKA\scripts\geocode_pipeline\ultimate_ingest.py"
    }
]

OUTPUT_MD = r"C:\Users\Administrator\.gemini\antigravity\brain\c8781589-0c66-4326-b4db-d328fceb731e\iebc_master_pipeline.md"

def generate_md():
    with open(OUTPUT_MD, "w", encoding="utf-8") as out:
        out.write("# CEKA IEBC Master Data Pipeline (GO HAM Blueprint)\n\n")
        out.write("> **System Architecture**: This document contains the highly chronological, uninterrupted backend pipeline required to extract, normalize, geocode, verify, and upsert the 290 Constituency records. It is a fully self-contained drop-in system.\n\n")
        
        out.write("---\n\n")
        
        for stage in PIPELINE_SCRIPTS:
            out.write(f"## {stage['title']}\n\n")
            out.write(f"**Objective**: {stage['desc']}\n\n")
            
            p = Path(stage['path'])
            if not p.exists():
                out.write(f"> [!WARNING]\n> Script not found at path: {p}\n\n")
                continue
                
            out.write(f"### Source: `{p.name}`\n")
            out.write("```python\n")
            
            with open(p, "r", encoding="utf-8") as f:
                content = f.read()
                out.write(content)
                if not content.endswith("\n"):
                    out.write("\n")
                    
            out.write("```\n\n---\n\n")
            
        out.write("## 🚀 Executing the Master Pipeline\n\n")
        out.write("To run this entire sequence autonomously drop-in style, execute the stages chronologically in a fresh terminal environment:\n\n")
        out.write("```powershell\n")
        out.write("# 1. Extract from PDF\n")
        out.write("python scripts/relentless_extractor.py\n\n")
        out.write("# 2. Clean and Normalize\n")
        out.write("python scripts/geocode_pipeline/clean_addresses.py\n\n")
        out.write("# 3. Primary Geocoding\n")
        out.write("python scripts/geocode_pipeline/geocode_addresses.py\n\n")
        out.write("# 4. RAG Fallback\n")
        out.write("python scripts/geocode_pipeline/geocoding_with_rag.py\n\n")
        out.write("# 5. Relational Sync\n")
        out.write("python scripts/geocode_pipeline/atomic_code_sync_v5.py\n\n")
        out.write("# 6. Production Ingestion\n")
        out.write("python scripts/geocode_pipeline/ultimate_ingest.py\n")
        out.write("```\n\n")
        out.write("**GOHAM.**\n")

    print(f"Successfully generated Master Pipeline Blueprint at:\n{OUTPUT_MD}")

if __name__ == "__main__":
    generate_md()
