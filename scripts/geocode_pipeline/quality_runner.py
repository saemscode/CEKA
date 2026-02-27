#!/usr/bin/env python3
"""
AUTOMATED QUALITY MONITORING RUNNER
RUNS PERIODIC QUALITY CHECKS AND ENHANCEMENTS
"""

import schedule
import time
from datetime import datetime
import logging
from data_quality_monitor import GeocodingDataQualityMonitor

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_quality_check():
    """Run quality check and enhancement"""
    logger.info("🔄 Running scheduled quality check...")
    monitor = GeocodingDataQualityMonitor()
    success = monitor.run_quality_enhancement()
    
    if success:
        logger.info("✅ Scheduled quality check completed successfully")
    else:
        logger.error("❌ Scheduled quality check failed")

def main():
    """Main scheduler function"""
    logger.info("🚀 STARTING AUTOMATED QUALITY MONITORING...")
    
    # Schedule quality checks (adjust timing as needed)
    schedule.every(1).hours.do(run_quality_check)  # Run every hour
    schedule.every().day.at("06:00").do(run_quality_check)  # Daily at 6 AM
    
    logger.info("⏰ Quality monitoring scheduler started")
    logger.info("   - Running every hour")
    logger.info("   - Additional run daily at 06:00")
    
    # Run immediately on startup
    run_quality_check()
    
    # Keep scheduler running
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute

if __name__ == "__main__":
    main()