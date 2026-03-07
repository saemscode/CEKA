import json
import re
from pathlib import Path

INPUT_FILE = Path("d:/CEKA/ceka v010/CEKA/scripts/constitution_full_text.txt")
OUTPUT_FILE = Path("d:/CEKA/ceka v010/CEKA/scripts/constitution_articles.json")

def parse_constitution():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        text = f.read()

    lines = text.splitlines()

    articles = []
    current_chapter_num = 0
    passed_preamble = False
    
    roman_to_int = {
        "ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5,
        "SIX": 6, "SEVEN": 7, "EIGHT": 8, "NINE": 9, "TEN": 10,
        "ELEVEN": 11, "TWELVE": 12, "THIRTEEN": 13, "FOURTEEN": 14,
        "FIFTEEN": 15, "SIXTEEN": 16, "SEVENTEEN": 17, "EIGHTEEN": 18
    }

    chapter_start_pattern = re.compile(r"^CHAPTER\s+([A-Z\-]+)", re.IGNORECASE)
    article_pattern = re.compile(r"^([0-9]+)\.\s*", re.IGNORECASE)
    page_marker_pattern = re.compile(r"--- PAGE [0-9]+ ---")
    header_pattern = re.compile(r"Constitution of Kenya, 2010")
    schedules_pattern = re.compile(r"^SCHEDULES$", re.IGNORECASE)
    preamble_pattern = re.compile(r"^PREAMBLE$", re.IGNORECASE)

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        if not line or page_marker_pattern.match(line) or header_pattern.match(line):
            i += 1
            continue
            
        # Skip Table of Contents: Don't start until we see PREAMBLE for real
        # (Assuming first PREAMBLE is on page 2 (TOC) and second is on page 11 (Start of Text))
        # Actually, let's just count how many times we've seen PREAMBLE or CHAPTER ONE.
        # Simpler: If it's the first 100 lines, it's TOC.
        if not passed_preamble:
            if i > 300 and preamble_pattern.match(line):
                passed_preamble = True
                print(f"Passed Preamble at line {i+1}")
            i += 1
            continue

        if schedules_pattern.match(line):
            print(f"Reached Schedules at line {i+1}. Stopping article parsing.")
            break

        chap_match = chapter_start_pattern.match(line)
        if chap_match:
            chap_word = chap_match.group(1).replace("-", "").upper()
            if chap_word in roman_to_int:
                current_chapter_num = roman_to_int[chap_word]
                j = i + 1
                while j < i + 4 and j < len(lines):
                    nj = lines[j].strip()
                    if article_pattern.match(nj) or chapter_start_pattern.match(nj) or schedules_pattern.match(nj):
                        break
                    j += 1
                i = j - 1
            i += 1
            continue

        art_match = article_pattern.match(line)
        if art_match:
            art_num = int(art_match.group(1))
            
            if art_num > 264:
                break
                
            art_content_start = line[art_match.end():].strip()
            
            # Title is line above
            art_title = f"Article {art_num}"
            prev_idx = i - 1
            while prev_idx >= 0:
                prev_line = lines[prev_idx].strip()
                if not prev_line or page_marker_pattern.match(prev_line) or header_pattern.match(prev_line):
                    prev_idx -= 1
                    continue
                if not article_pattern.match(prev_line) and not chapter_start_pattern.match(prev_line):
                    art_title = prev_line
                break
            
            content_lines = [art_content_start]
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                if not next_line:
                    j += 1
                    continue
                if page_marker_pattern.match(next_line) or header_pattern.match(next_line):
                    j += 1
                    continue
                
                # Check for next article or chapter or schedules
                if article_pattern.match(next_line):
                    # Peek next line to see if this is an article title
                    break
                if chapter_start_pattern.match(next_line) or schedules_pattern.match(next_line):
                    break
                
                # Next article title detection
                nk = j + 1
                is_next_title = False
                while nk < len(lines) and nk < j + 5:
                    pk = lines[nk].strip()
                    if not pk or page_marker_pattern.match(pk) or header_pattern.match(pk):
                        nk += 1
                        continue
                    if article_pattern.match(pk):
                        if len(next_line) < 100 and not next_line.startswith(("(", "1)", "a)")):
                           is_next_title = True
                        break
                    break
                
                if is_next_title:
                    break
                    
                content_lines.append(next_line)
                j += 1
            
            articles.append({
                "chapter_number": current_chapter_num,
                "article_number": art_num,
                "title_en": art_title,
                "content_en": " ".join(content_lines).strip()
            })
            i = j - 1
        i += 1

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(articles, f, indent=2)
    
    print(f"Final Count: {len(articles)} articles across {len(set(a['chapter_number'] for a in articles))} chapters.")

if __name__ == "__main__":
    parse_constitution()
