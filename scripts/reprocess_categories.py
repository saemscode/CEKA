import sys
import json
import logging
from pathlib import Path
import os

try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(dotenv_path=str(env_path), override=True)
except ImportError:
    pass

from supabase_direct import SupabaseDirect
from multi_llm_orchestrator import MultiLLMOrchestrator

logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

ALLOWED_CATEGORIES = [
    'Finance', 'Health', 'Law & Criminal Justice', 'Governance',
    'Environment', 'Education', 'Agriculture', 'Devolution & Counties',
    'Infrastructure', 'Social Affairs', 'Defence & Security', 'Constitutional'
]

def main():
    db = SupabaseDirect()
    orchestrator = MultiLLMOrchestrator()
    
    logger.info("Fetching bills to verify categories...")
    
    bills = db.select('bills', 'id, title, summary, description, category, sponsor')
    
    target_bills = [
        b for b in bills 
        if b.get('category') in ['All Portfolios', 'ALL PORTIFOLIOS', 'Uncategorized', '', None] 
        or b.get('category') not in ALLOWED_CATEGORIES
    ]
    logger.info(f"Found {len(target_bills)} bills requiring category correction.")
    
    if not target_bills:
        logger.info("Database is clean. No bills left to categorize.")
        return

    PROMPT_TEMPLATE = """You are a legislative intelligence analyst. Focus on Kenyan policy domains context where appropriate.
    
BILL TITLE: {title}
SPONSOR: {sponsor}
SUMMARY: {summary}
LONG TITLE: {long_title}

Return a single JSON object with EXACTLY one key: "category".
The value MUST be chosen strictly from this exact list:
{allowed_list}

RULES:
- If it is a tax/appropriation bill, choose 'Finance'.
- If it is about courts, criminal law, or legal procedures, choose 'Law & Criminal Justice'.
- Do not invent categories. Return ONLY the JSON object.
"""

    system_prompt = "You are a policy analyst categorizing legislative bills. Return ONLY valid JSON."

    updated_count = 0
    for i, bill in enumerate(target_bills):
        logger.info(f"[{i+1}/{len(target_bills)}] Processing: {bill.get('title')}...")
        prompt = PROMPT_TEMPLATE.format(
            title=bill.get('title', ''),
            sponsor=bill.get('sponsor', ''),
            summary=bill.get('summary', ''),
            long_title=bill.get('description', ''),
            allowed_list=json.dumps(ALLOWED_CATEGORIES)
        )
        
        try:
            # Pass our orchestrator some reliable models
            res = orchestrator.synthesize(prompt, system_prompt, ["cerebras", "groq", "openrouter", "deepseek"])
            if res:
                data = orchestrator.extract_json(res)
                cat = data.get('category')
                
                # Check for subtle variations
                if cat == 'Finance & Taxation': cat = 'Finance'

                if cat in ALLOWED_CATEGORIES:
                    db.update('bills', {'category': cat}, eq='id', eq_val=bill['id'])
                    logger.info(f" ✅ Updated {bill['id']} -> {cat}")
                    updated_count += 1
                else:
                    logger.warning(f" ⚠️ Invalid category returned: {cat}")
        except Exception as e:
            logger.error(f" Failed to process {bill['id']}: {e}")

    logger.info(f"Successfully recategorized {updated_count}/{len(target_bills)} bills.")

if __name__ == "__main__":
    main()
