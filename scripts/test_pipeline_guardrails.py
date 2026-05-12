import sys
import os
# Add the 'scripts' directory to sys.path so we can import sibling modules
sys.path.append(os.path.dirname(__file__))

from stage_detector import detect_stage_from_text, extract_date_from_order_paper, StageDetector
from sovereign_refresh import SovereignRefresh, PORTFOLIO_KEYWORD_POOL

def test_temporal_guard():
    print("--- Testing Temporal Guard ---")
    mock_bill = {"id": "test-2026", "title": "Finance Bill, 2026", "session_year": 2026}
    
    # Document text from 2024 mentioning withdrawal
    doc_2024 = "Tuesday, 25th June, 2024: The Finance Bill was withdrawn after protests."
    
    detector = StageDetector()
    results = detector.detect_stages_from_document(doc_2024, [mock_bill])
    
    if not results:
        print("✅ SUCCESS: 2024 document ignored for 2026 bill.")
    else:
        print(f"❌ FAILURE: 2024 document matched! Detected: {results}")

def test_keyword_classification():
    print("\n--- Testing Keyword Classification (AI Checker) ---")
    sr = SovereignRefresh()
    
    # Mocking DB update to prevent UUID error
    sr.db.update = lambda table, data, eq, eq_val: print(f"      [Mock DB] Update {table} with {data}")
    
    mock_bill = {"id": "test-fin", "title": "Revenue and Tax Bill", "category": None}
    intel = {"category": "Governance"} # AI makes a "mediocre" guess
    text = "This bill relates to VAT collection and Treasury revenue."
    
    patched = sr._atomic_patch(mock_bill["id"], intel, mock_bill, text)
    
    if patched.get("category") == "Finance":
        print("✅ SUCCESS: AI Checker corrected 'Governance' to 'Finance' based on keywords.")
    else:
        print(f"❌ FAILURE: Category stayed as {patched.get('category')}")

if __name__ == "__main__":
    test_temporal_guard()
    test_keyword_classification()
