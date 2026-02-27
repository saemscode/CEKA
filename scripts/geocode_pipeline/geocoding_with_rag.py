#!/usr/bin/env python3
"""
Enhanced geocoding with DeepSeek RAG integration.
This module integrates the RAG system with your existing geocoding pipeline.
"""

import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
import logging
import re

# Add scripts directory to path
scripts_dir = Path(__file__).parent
sys.path.insert(0, str(scripts_dir))

from embeddings.deepseek_rag import get_rag_system, initialize_rag_system

logger = logging.getLogger(__name__)

class EnhancedGeocodingWithRAG:
    def __init__(self):
        self.rag_system = get_rag_system()
        self.rag_initialized = False
    
    def initialize(self) -> bool:
        """Initialize the RAG system for geocoding."""
        if not self.rag_initialized:
            self.rag_initialized = initialize_rag_system()
        return self.rag_initialized
    
    def safe_string(self, value, default=""):
        """Safe string conversion with NaN handling."""
        if value is None:
            return default
        try:
            import pandas as pd
            if pd.isna(value):
                return default
        except (TypeError, ValueError, ImportError):
            pass
        try:
            result = str(value).strip()
            return result if result else default
        except (TypeError, ValueError):
            return default
    
    def extract_location_insights(self, query: str, k: int = 3) -> List[Dict[str, Any]]:
        """Extract location insights using RAG context."""
        if not self.initialize():
            return []
        
        return self.rag_system.retrieve_context(query, k)
    
    def enhance_geocoding_with_context(self, row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Enhance geocoding with RAG context for a specific row."""
        if not self.initialize():
            return None
        
        constituency = self.safe_string(row.get('constituency_name', ''))
        county = self.safe_string(row.get('county', ''))
        landmark = self.safe_string(row.get('direction_landmark') or row.get('landmark', ''))
        office_location = self.safe_string(row.get('office_location', ''))
        
        if not constituency and not county:
            return None
        
        # Use the RAG system's enhancement
        rag_result = self.rag_system.enhance_geocoding_query(constituency, county, landmark, office_location)
        
        if rag_result and "lat" in rag_result and "lon" in rag_result:
            logger.info(f"RAG enhancement successful for {constituency}: found coordinates")
            return rag_result
        
        # Even without coordinates, return insights for query enhancement
        insights = self.get_rag_insights(row)
        if insights:
            return {
                "rag_insights": insights,
                "constituency": constituency,
                "county": county,
                "method": "rag_insights_only",
                "confidence": 0.3,
                "source_type": "rag_enhanced"
            }
        
        return None
    
    def get_rag_insights(self, row: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get RAG insights for a geocoding row."""
        return self.rag_system.get_rag_insights(row)
    
    def generate_enhanced_queries(self, row: Dict[str, Any]) -> List[str]:
        """Generate enhanced geocoding queries using RAG insights."""
        base_queries = []
        constituency = self.safe_string(row.get('constituency_name', ''))
        county = self.safe_string(row.get('county', ''))
        landmark = self.safe_string(row.get('direction_landmark') or row.get('landmark', ''))
        office_location = self.safe_string(row.get('office_location', ''))
        
        # Base queries
        if constituency and county:
            base_queries.append(f"{constituency}, {county} County, Kenya")
            base_queries.append(f"{office_location}, {constituency}, Kenya" if office_location else "")
            base_queries.append(f"{landmark}, {constituency}, Kenya" if landmark else "")
            base_queries.append(f"IEBC office {office_location}, {constituency}" if office_location else "")
        
        # Get RAG insights for query enhancement
        if self.initialize():
            insights = self.get_rag_insights(row)
            
            # Extract location patterns from insights
            for insight in insights:
                insight_text = insight.get('text', '')
                
                # Look for location patterns in insights
                if "near" in insight_text.lower():
                    # Extract potential location references
                    near_matches = re.findall(r'near\s+([^.,]+)', insight_text, re.IGNORECASE)
                    for match in near_matches:
                        location_ref = match.strip()
                        if len(location_ref) > 5:  # Reasonable length
                            if constituency:
                                base_queries.append(f"{constituency} near {location_ref}")
                
                if "opposite" in insight_text.lower():
                    opposite_matches = re.findall(r'opposite\s+([^.,]+)', insight_text, re.IGNORECASE)
                    for match in opposite_matches:
                        location_ref = match.strip()
                        if len(location_ref) > 5:
                            if constituency:
                                base_queries.append(f"{constituency} opposite {location_ref}")
        
        # Remove empty queries and deduplicate
        base_queries = [q.strip() for q in base_queries if q and len(q.strip()) > 10]  # Minimum length
        return list(dict.fromkeys(base_queries))
    
    def should_use_rag(self, row: Dict[str, Any]) -> bool:
        """Determine if RAG should be used for this row based on available data."""
        constituency = self.safe_string(row.get('constituency_name', ''))
        county = self.safe_string(row.get('county', ''))
        landmark = self.safe_string(row.get('direction_landmark') or row.get('landmark', ''))
        office_location = self.safe_string(row.get('office_location', ''))
        
        # Use RAG if we have at least constituency and some additional context
        has_basic_context = constituency and county
        has_additional_context = landmark or office_location
        
        return has_basic_context and has_additional_context

# Global instance
_enhanced_geocoding_instance = None

def get_enhanced_geocoder() -> EnhancedGeocodingWithRAG:
    """Get or create global enhanced geocoding instance."""
    global _enhanced_geocoding_instance
    if _enhanced_geocoding_instance is None:
        _enhanced_geocoding_instance = EnhancedGeocodingWithRAG()
    return _enhanced_geocoding_instance

def test_enhanced_geocoding():
    """Test function for enhanced geocoding with RAG."""
    enhanced_geocoder = get_enhanced_geocoder()
    
    # Test data
    test_row = {
        'constituency_name': 'Nairobi Central',
        'county': 'Nairobi',
        'direction_landmark': 'Central Police Station',
        'office_location': 'IEBC Office near City Hall',
        'landmark': 'City Hall'
    }
    
    print("🧪 Testing Enhanced Geocoding with RAG...")
    
    # Test initialization
    initialized = enhanced_geocoder.initialize()
    print(f"RAG System Initialized: {initialized}")
    
    if initialized:
        # Test query generation
        queries = enhanced_geocoder.generate_enhanced_queries(test_row)
        print(f"Generated queries: {queries}")
        
        # Test context enhancement
        enhanced_result = enhanced_geocoder.enhance_geocoding_with_context(test_row)
        if enhanced_result:
            print("✅ RAG enhancement successful!")
            if "lat" in enhanced_result:
                print(f"Coordinates found: {enhanced_result['lat']}, {enhanced_result['lon']}")
            elif "rag_insights" in enhanced_result:
                print(f"Found {len(enhanced_result['rag_insights'])} contextual insights")
        else:
            print("❌ RAG enhancement failed")
    else:
        print("❌ RAG system initialization failed")

if __name__ == "__main__":
    test_enhanced_geocoding()