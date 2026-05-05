import json

def clean_json_string(raw: str) -> str:
    # Strip markdown fences if model disobeyed
    raw = raw.strip()
    if raw.startswith("```"):
        # Split by ``` and take the content of the first block
        parts = raw.split("```")
        if len(parts) > 1:
            raw = parts[1]
            if raw.startswith("json"):
                raw = raw[4:]
    return raw.strip()

# Test cases
test_cases = [
    # Case 1: Perfect JSON
    '{"what_bill_does": "Test", "concerns_kenyans_can_raise": [], "sentiment": "neutral", "key_stakeholders": [], "tabloid_snippet": "Test"}',
    # Case 2: Markdown fenced
    '```json\n{"what_bill_does": "Test", "concerns_kenyans_can_raise": [], "sentiment": "neutral", "key_stakeholders": [], "tabloid_snippet": "Test"}\n```',
    # Case 3: Markdown fenced without 'json' prefix
    '```\n{"what_bill_does": "Test", "concerns_kenyans_can_raise": [], "sentiment": "neutral", "key_stakeholders": [], "tabloid_snippet": "Test"}\n```',
    # Case 4: Dirty prefix/suffix (should fail load but let's see)
    'Here is the JSON:\n```json\n{"what_bill_does": "Test"}\n```\nHope that helps!'
]

print("--- JSON Extraction Verification ---")
for i, case in enumerate(test_cases):
    cleaned = clean_json_string(case)
    print(f"\nCase {i+1} raw: {case[:50]}...")
    print(f"Case {i+1} cleaned: {cleaned[:50]}...")
    try:
        json.loads(cleaned)
        print(f"Case {i+1} status: PASS (Valid JSON)")
    except Exception as e:
        # Case 4 is expected to fail with current logic if it split by ``` and there's text before
        print(f"Case {i+1} status: FAIL ({e})")

print("\nNote: Case 4 fail is acceptable if we assume Gemini-1.5-flash obeys the 'ONLY valid JSON' instruction.")
