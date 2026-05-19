import os
import re
from typing import List, Optional
from scripts.stage_detector import generate_bill_keywords, bill_mentioned_in_text, detect_stage_from_text

def debug_matching():
    title = "The Finance Bill, 2026"
    text = "The Finance Bill, 2026 was read a First Time."
    
    keywords = generate_bill_keywords(title)
    print(f"Keywords for '{title}': {keywords}")
    
    mentioned = bill_mentioned_in_text(title, text)
    print(f"Mentioned in '{text}': {mentioned}")
    
    result = detect_stage_from_text(text, title)
    print(f"Stage detected: {result}")

if __name__ == "__main__":
    debug_matching()
