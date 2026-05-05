import logging
import os
from multi_llm_orchestrator import MultiLLMOrchestrator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_orchestrator():
    logger.info("Initializing Orchestrator...")
    orc = MultiLLMOrchestrator()
    
    test_prompt = "Say 'CEKA Intelligence Online' and nothing else."
    
    # Test individual providers
    providers = ["gemini", "groq", "anthropic", "openai", "openrouter"]
    
    for p in providers:
        if orc.api_keys.get(p):
            logger.info(f"Testing provider: {p}")
            res = orc.synthesize(test_prompt, provider_chain=[p])
            if res:
                logger.info(f"  [SUCCESS] {p}: {res.strip()}")
            else:
                logger.error(f"  [FAILED] {p}")
        else:
            logger.warning(f"  [SKIPPED] {p} (No API key found in .env)")

if __name__ == "__main__":
    test_orchestrator()
