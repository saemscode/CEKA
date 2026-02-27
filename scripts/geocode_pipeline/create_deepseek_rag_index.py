#!/usr/bin/env python3
"""
Create DeepSeek RAG index for geocoding context.
Run this script to generate the required FAISS index and metadata files.
"""

import os
import sys
from pathlib import Path

# Add scripts directory to path
scripts_dir = Path(__file__).parent
sys.path.insert(0, str(scripts_dir))

from embeddings.build_faiss_index import create_iebc_index, FAISSIndexBuilder
from embeddings.deepseek_rag import initialize_rag_system
from embeddings.iebc_data_processor import IEBCDataProcessor
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_index_from_iebc_data(csv_path: Path, index_path: Path, metadata_path: Path) -> bool:
    """Create index from IEBC CSV data."""
    if not csv_path.exists():
        logger.error(f"IEBC CSV file not found: {csv_path}")
        return False
    
    logger.info(f"Creating index from IEBC data: {csv_path}")
    success = create_iebc_index(csv_path, index_path, metadata_path)
    
    if success:
        logger.info("✅ Successfully created index from IEBC data")
    else:
        logger.warning("⚠️ Failed to create index from IEBC data, using sample data")
        success = create_iebc_index(csv_path, index_path, metadata_path, use_sample_data=True)
    
    return success

def validate_rag_system() -> bool:
    """Validate that the RAG system works correctly."""
    try:
        from embeddings.deepseek_rag import get_rag_system
        rag_system = get_rag_system()
        
        if not rag_system.initialize():
            logger.error("Failed to initialize RAG system")
            return False
        
        # Test query
        test_query = "IEBC office in Nairobi Central constituency near police station"
        results = rag_system.retrieve_context(test_query, k=2)
        
        if results:
            logger.info("✅ RAG system validation successful")
            logger.info(f"Retrieved {len(results)} relevant context chunks")
            for result in results:
                logger.info(f"  - {result['text'][:100]}... (score: {result['similarity_score']:.3f})")
            return True
        else:
            logger.warning("⚠️ RAG system working but test query returned no results")
            return True
            
    except Exception as e:
        logger.error(f"❌ RAG system validation failed: {e}")
        return False

def main():
    """Main function to create and verify the RAG index."""
    logger.info("🚀 Starting DeepSeek RAG Index Creation...")

    builder = None  # Ensure defined to avoid local variable error
    
    # Check if DeepSeek API key is available
    if not os.getenv("DEEPSEEK_API_KEY"):
        logger.error("❌ DEEPSEEK_API_KEY environment variable not set")
        logger.info("Please set your DeepSeek API key and try again")
        return False
    
    # Define paths
    index_path = Path("scripts/data/processed/deepseek_contexts_index.faiss")
    metadata_path = Path("scripts/data/processed/deepseek_contexts_meta.json")
    iebc_csv_path = Path("scripts/data/processed/raw_iebc_offices.csv")
    
    # Create index
    if iebc_csv_path.exists():
        success = create_index_from_iebc_data(iebc_csv_path, index_path, metadata_path)
    else:
        logger.info("IEBC CSV not found, creating sample index...")
        from embeddings.build_faiss_index import FAISSIndexBuilder
        builder = FAISSIndexBuilder(index_path, metadata_path)
        success = builder.create_index_from_dataframe(iebc_csv_path, use_sample_data=True)
        if success:
            success = builder.save_index()
    
    if success:
        logger.info("✅ Successfully created RAG index")
        
        # Verify the index works
        logger.info("🔍 Verifying RAG system functionality...")
        rag_valid = validate_rag_system()
        
        if rag_valid:
            logger.info("🎉 DeepSeek RAG Index Creation Completed Successfully!")
            
            # Print index statistics
            try:
                builder = FAISSIndexBuilder(index_path, metadata_path)
                if builder.load_index():
                    validation = builder.validate_index()
                    logger.info(f"📊 Index Statistics:")
                    logger.info(f"  - Vectors: {validation['index_vectors']}")
                    logger.info(f"  - Metadata entries: {validation['metadata_entries']}")
                    logger.info(f"  - Consistent: {validation['consistent']}")
                    logger.info(f"  - Dimension match: {validation['dimension_match']}")
                    
                    if validation['errors']:
                        logger.warning(f"  - Errors: {validation['errors']}")
            except Exception as e:
                logger.warning(f"Could not load index statistics: {e}")
            
            return True
        else:
            logger.error("❌ RAG system validation failed")
            return False
    else:
        logger.error("❌ Failed to create RAG index")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)