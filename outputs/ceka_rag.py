import os
import re
from typing import List, Tuple

# ----- CHANGE THIS TO YOUR ACTUAL DOCUMENTS FOLDER -----
DOCS_DIR = r"D:\CEKA\ceka v010\CEKA\outputs\ceka_docs"
# -------------------------------------------------------

MAX_CHUNK_LEN = 800
TOP_K = 4

def load_documents() -> List[Tuple[str, str]]:
    if not os.path.isdir(DOCS_DIR):
        print(f"❌ ERROR: Folder not found: {DOCS_DIR}")
        print("   Create this folder and put your .txt files inside it.")
        return []
    docs = []
    for filename in os.listdir(DOCS_DIR):
        if filename.endswith(".txt"):
            path = os.path.join(DOCS_DIR, filename)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            docs.append((filename, content))
    return docs

def search_documents(query: str, docs: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
    query_lower = query.lower()
    keywords = [w for w in re.findall(r"\b\w+\b", query_lower) if len(w) > 3]
    if not keywords:
        keywords = query_lower.split()[:3]
    
    matches = []
    for filename, content in docs:
        lines = content.splitlines()
        for idx, line in enumerate(lines):
            line_lower = line.lower()
            score = sum(line_lower.count(kw) for kw in keywords)
            if score == 0:
                continue
            start = max(0, idx - 2)
            end = min(len(lines), idx + 3)
            chunk = "\n".join(lines[start:end])
            if len(chunk) > MAX_CHUNK_LEN:
                chunk = chunk[:MAX_CHUNK_LEN] + "..."
            matches.append((filename, chunk, score))
    
    matches.sort(key=lambda x: x[2], reverse=True)
    return [(name, chunk) for name, chunk, _ in matches[:TOP_K]]

def build_prompt(question: str, passages: List[Tuple[str, str]]) -> str:
    references = ""
    for name, chunk in passages:
        references += f"[DOCUMENT: {name}]\n{chunk}\n\n"
    
    prompt = f"""You are CEKA, the Civic Education Kenya assistant.

ANSWER ONLY using the reference documents supplied below.
If the answer is not found in the references, respond exactly:
real data unavailable

--- REFERENCE DOCUMENTS ---
{references}

--- USER QUESTION ---
{question}

--- ANSWER ---"""
    return prompt

if __name__ == "__main__":
    docs = load_documents()
    if not docs:
        exit(1)
    print(f"✅ Loaded {len(docs)} documents from {DOCS_DIR}")
    print("\n📖 CEKA Document Search + Prompt Builder")
    print("Type your question. Press Enter twice to quit.\n")
    while True:
        q = input("❓ Your question: ").strip()
        if not q:
            break
        passages = search_documents(q, docs)
        if not passages:
            print("⚠️ No relevant passages found. Try rephrasing.\n")
            continue
        final_prompt = build_prompt(q, passages)
        print("\n" + "="*60)
        print("📋 COPY THE PROMPT BELOW INTO PocketPal AI")
        print("="*60 + "\n")
        print(final_prompt)
        print("\n" + "="*60 + "\n")