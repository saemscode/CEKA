import json
from pathlib import Path

FILE = Path("d:/CEKA/ceka v010/CEKA/scripts/constitution_articles.json")

if not FILE.exists():
    print(f"File {FILE} does not exist.")
    exit(1)

with open(FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

chapters = set()
article_counts = {}

for art in data:
    ch = art.get("chapter_number")
    chapters.add(ch)
    article_counts[ch] = article_counts.get(ch, 0) + 1

print(f"Total Articles: {len(data)}")
print(f"Chapters found: {sorted(list(chapters))}")
for ch in sorted(list(chapters)):
    print(f"Chapter {ch}: {article_counts[ch]} articles")
