import re

# The hardened pattern from legislative_scraper.py
_BILL_REQUIRED_PATTERN = r'\b(bill|amendment bill|finance bill|appropriation bill|division of revenue bill|county allocation of revenue bill)\b'
_BILL_BLOCKLIST = [
    'hansard', 'order paper', 'order of business', 'votes and proceedings',
    'committee report', 'sessional paper', 'report of the', 'petition',
    'message from the president', 'statement by', 'presentation of',
    'notice of motion', 'question for', 'standing orders', 'gazette notice',
    'legal notice', 'public notice', 'advertisement', 'tenders', 'vacancies'
]

def is_bill_document(title: str) -> bool:
    t = title.lower()
    # 1. Check required pattern
    if not re.search(_BILL_REQUIRED_PATTERN, t):
        return False
    # 2. Check blocklist
    if any(blocked in t for blocked in _BILL_BLOCKLIST):
        return False
    return True

# Test cases
test_cases = [
    ("The Education Amendment Bill 2024", True),
    ("Finance Bill 2024", True),
    ("Appropriation Bill (National Assembly Bill No. 1 of 2024)", True),
    ("Division of Revenue Bill 2024", True),
    ("County Allocation of Revenue Bill", True),
    ("The Hansard - Tuesday 12th March 2024", False), # Blocklist
    ("Order Paper for Wednesday 13th March", False), # Blocklist
    ("Committee Report on the Education Bill", False), # Blocklist
    ("National Assembly Votes and Proceedings", False), # Blocklist
    ("Sessional Paper No. 1 of 2024", False), # Blocklist
    ("Gazette Notice No. 1234", False), # Blocklist
    ("Random Document Title", False), # Missing bill pattern
    ("The Bill regarding Something Else", True), # Basic bill match
]

print("--- Scraper Regex Verification ---")
results = []
for title, expected in test_cases:
    actual = is_bill_document(title)
    status = "PASS" if actual == expected else "FAIL"
    results.append(f"{status}: '{title}' -> {actual} (Expected: {expected})")
    print(results[-1])

if all("PASS" in r for r in results):
    print("\n✅ All scraper filter tests passed.")
else:
    print("\n❌ Some scraper filter tests failed.")
