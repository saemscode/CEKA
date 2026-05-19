import os
import json
import logging
from scripts.stage_detector import detect_stage_from_text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_logic():
    # Scenario: Finding "Finance Bill is withdrawn" in a document,
    # but the bill record is "The Finance Bill, 2026".
    
    bill_title = "The Finance Bill, 2026"
    
    # 1. Collision Scenario: Plain "Finance Bill" withdrawn
    colliding_text = "The Finance Bill has been withdrawn by the mover."
    result1 = detect_stage_from_text(colliding_text, bill_title)
    logger.info(f"Test 1 (Plain collision): result={result1}")
    
    # 2. explicit Year Collision: 2024 Finance Bill withdrawn
    colliding_text_2024 = "The Finance Bill, 2024 has been withdrawn."
    result2 = detect_stage_from_text(colliding_text_2024, bill_title)
    logger.info(f"Test 2 (2024 collision): result={result2}")
    
    # 3. Successful Detection: 2026 Finance Bill First Reading
    correct_text = "The Finance Bill, 2026 was read a First Time."
    result3 = detect_stage_from_text(correct_text, bill_title)
    logger.info(f"Test 3 (Correct 2026 signal): result={result3}")

    # Results analysis
    if result1 == "discarded":
        logger.error("❌ FAILURE: Plain 'Finance Bill' still triggers 'discarded' for 2026 bill.")
    elif result2 == "discarded":
        logger.error("❌ FAILURE: 'Finance Bill, 2024' still triggers 'discarded' for 2026 bill.")
    elif result3 != "first_reading":
        logger.error(f"❌ FAILURE: Correct 2026 signal not detected correctly (got {result3}).")
    else:
        logger.info("✅ SUCCESS: Temporal guards and year-aware matching working as intended.")

if __name__ == "__main__":
    verify_logic()
