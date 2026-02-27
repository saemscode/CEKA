#!/usr/bin/env python3
"""
IEBC GeoJSON Conversion Script - COMPLETE FIXED VERSION
Eliminates all NaN values and ensures valid JSON output
"""
import pandas as pd
import json
from pathlib import Path
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# File paths
INPUT_CSV = Path("scripts/data/processed/iebc_offices_rows.csv")
OUTPUT_GEOJSON = Path("scripts/data/outputs/iebc_offices.geojson")

def safe_string(value, default=""):
    """Safely convert any value to string with guaranteed non-empty default"""
    if value is None:
        return default
    try:
        if hasattr(value, 'any'):  # Handle pandas Series/arrays
            if len(value) == 1:
                return safe_string(value.iloc[0] if hasattr(value, 'iloc') else value[0], default)
            else:
                return default
    except (TypeError, ValueError):
        pass
    
    try:
        if pd.isna(value):
            return default
    except (TypeError, ValueError):
        pass
    
    try:
        result = str(value).strip()
        return result if result else default
    except (TypeError, ValueError):
        return default

def safe_float(value, default=0.0):
    """Safely convert any value to float with guaranteed default"""
    if value is None:
        return default
    try:
        if hasattr(value, 'any'):  # Handle pandas Series/arrays
            if len(value) == 1:
                return safe_float(value.iloc[0] if hasattr(value, 'iloc') else value[0], default)
            else:
                return default
    except (TypeError, ValueError):
        pass
    
    try:
        if pd.isna(value):
            return default
    except (TypeError, ValueError):
        pass
    
    try:
        return float(value)
    except (ValueError, TypeError):
        return default

def safe_int(value, default=0):
    """Safely convert any value to int with guaranteed default"""
    if value is None:
        return default
    try:
        if hasattr(value, 'any'):  # Handle pandas Series/arrays
            if len(value) == 1:
                return safe_int(value.iloc[0] if hasattr(value, 'iloc') else value[0], default)
            else:
                return default
    except (TypeError, ValueError):
        pass
    
    try:
        if pd.isna(value):
            return default
    except (TypeError, ValueError):
        pass
    
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return default

def safe_bool(value, default=False):
    """Safely convert any value to boolean with guaranteed default"""
    if value is None:
        return default
    try:
        if hasattr(value, 'any'):  # Handle pandas Series/arrays
            if len(value) == 1:
                return safe_bool(value.iloc[0] if hasattr(value, 'iloc') else value[0], default)
            else:
                return default
    except (TypeError, ValueError):
        pass
    
    try:
        if pd.isna(value):
            return default
    except (TypeError, ValueError):
        pass
    
    try:
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return bool(value)
        if isinstance(value, str):
            return value.lower() in ['true', 'yes', '1', 't', 'y']
        return default
    except:
        return default

def create_geojson_features(df):
    """Create GeoJSON features from DataFrame with guaranteed valid values"""
    features = []
    
    for _, row in df.iterrows():
        # Skip rows without valid coordinates
        lat = safe_float(row.get('latitude'))
        lon = safe_float(row.get('longitude'))
        
        if lat == 0.0 and lon == 0.0:
            continue
            
        # Create properties with guaranteed values
        properties = {
            "constituency_code": safe_string(row.get('constituency_code', '000')).zfill(3),
            "constituency_name": safe_string(row.get('constituency_name', 'Unknown Constituency')),
            "county": safe_string(row.get('county', 'Unknown County')),
            "office_location": safe_string(row.get('office_location', 'Location information not available')),
            "landmark": safe_string(row.get('landmark', 'Landmark information not available')),
            "distance_from_landmark": safe_string(row.get('distance_from_landmark', 'Distance information not available')),
            "source": "IEBC PDF - Physical Locations of County and Constituency Offices in Kenya",
            "geocode_method": safe_string(row.get('geocode_method', 'unknown')),
            "geocode_confidence": safe_float(row.get('geocode_confidence', 0.0)),
            "formatted_address": safe_string(row.get('formatted_address', 'Address not available')),
            "verified": safe_bool(row.get('verified', False)),
            "last_updated": datetime.now().isoformat(),
            "notes": safe_string(row.get('notes', '')),
            "accuracy_meters": safe_float(row.get('accuracy_meters', 9999.0)),
            "geocode_status": safe_string(row.get('geocode_status', 'unknown'))
        }
        
        # Create geometry
        geometry = {
            "type": "Point",
            "coordinates": [
                safe_float(row.get('longitude', 0.0)),
                safe_float(row.get('latitude', 0.0))
            ]
        }
        
        # Validate coordinates are within Kenya bounds
        if not (33.5 <= geometry['coordinates'][0] <= 42.0 and -4.9 <= geometry['coordinates'][1] <= 5.0):
            logger.warning(f"Coordinates outside Kenya bounds: {geometry['coordinates']}")
            continue
        
        # Create feature
        feature = {
            "type": "Feature",
            "properties": properties,
            "geometry": geometry
        }
        
        features.append(feature)
    
    return features

def validate_geojson_structure(geojson_data):
    """Validate GeoJSON structure and ensure no NaN values"""
    try:
        # Check top-level structure
        assert geojson_data['type'] == 'FeatureCollection'
        assert 'features' in geojson_data
        assert 'metadata' in geojson_data
        
        # Check each feature
        for feature in geojson_data['features']:
            assert feature['type'] == 'Feature'
            assert 'properties' in feature
            assert 'geometry' in feature
            
            # Check properties for NaN
            for key, value in feature['properties'].items():
                if value is None:
                    logger.warning(f"Found None value in property: {key}")
                    feature['properties'][key] = ""
                elif pd.isna(value):
                    logger.warning(f"Found NaN value in property: {key}")
                    feature['properties'][key] = ""
            
            # Check geometry
            assert feature['geometry']['type'] == 'Point'
            assert len(feature['geometry']['coordinates']) == 2
            assert all(isinstance(coord, (int, float)) for coord in feature['geometry']['coordinates'])
        
        return True
    except Exception as e:
        logger.error(f"GeoJSON validation failed: {e}")
        return False

def main():
    """Main conversion function with comprehensive error handling"""
    logger.info("Starting COMPLETE GeoJSON conversion...")
    
    if not INPUT_CSV.exists():
        logger.error(f"Input file not found: {INPUT_CSV}")
        return
    
    try:
        # Load data with proper NaN handling
        df = pd.read_csv(INPUT_CSV)
        logger.info(f"Loaded {len(df)} rows")
        
        # Replace any remaining NaN values
        df = df.fillna({
            'constituency_code': '000',
            'constituency_name': 'Unknown Constituency', 
            'county': 'Unknown County',
            'office_location': 'Location not specified',
            'landmark': 'Landmark not specified',
            'distance_from_landmark': 'Distance not specified',
            'geocode_method': 'unknown',
            'formatted_address': 'Address not available',
            'latitude': 0.0,
            'longitude': 0.0,
            'geocode_confidence': 0.0,
            'accuracy_meters': 9999.0,
            'geocode_status': 'unknown'
        })
        
        # Filter out rows without valid coordinates
        valid_df = df[(df['latitude'] != 0.0) & (df['longitude'] != 0.0)].copy()
        logger.info(f"Found {len(valid_df)} rows with valid coordinates")
        
        if len(valid_df) == 0:
            logger.error("No valid coordinates found in dataset!")
            return
        
        # Create GeoJSON structure
        features = create_geojson_features(valid_df)
        
        geojson = {
            "type": "FeatureCollection",
            "name": "IEBC Constituency Offices in Kenya",
            "description": "Physical locations of IEBC constituency offices for voter registration",
            "metadata": {
                "source": "Independent Electoral and Boundaries Commission (IEBC)",
                "extracted_from": "Physical_Locations_of_County_and_Constituency_Offices_in_Kenya.pdf",
                "generated_on": datetime.now().isoformat(),
                "total_offices": len(features),
                "coordinate_system": "WGS84 (EPSG:4326)",
                "data_quality": "Enhanced with multiple geocoding providers",
                "version": "2.0"
            },
            "features": features
        }
        
        # Validate GeoJSON structure
        if not validate_geojson_structure(geojson):
            logger.error("GeoJSON validation failed!")
            return
        
        # Save GeoJSON with proper encoding
        OUTPUT_GEOJSON.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_GEOJSON, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2, default=str)
        
        logger.info(f"✅ SUCCESS: Created valid GeoJSON with {len(features)} features at {OUTPUT_GEOJSON}")
        
        # Print comprehensive summary
        county_summary = valid_df['county'].value_counts()
        logger.info("Office distribution by county:")
        for county, count in county_summary.head(15).items():
            logger.info(f"  {county}: {count}")
            
        method_summary = valid_df['geocode_method'].value_counts()
        logger.info("Geocoding method summary:")
        for method, count in method_summary.items():
            logger.info(f"  {method}: {count}")
        
        # Data quality metrics
        avg_confidence = valid_df['geocode_confidence'].mean()
        high_confidence = len(valid_df[valid_df['geocode_confidence'] >= 0.7])
        logger.info(f"Data Quality: Average confidence {avg_confidence:.2%}, {high_confidence} high-confidence results")
        
        # Final NaN check
        nan_count = valid_df.isnull().sum().sum()
        if nan_count == 0:
            logger.info("🎉 PERFECT: Zero NaN values in final GeoJSON output!")
        else:
            logger.warning(f"Found {nan_count} NaN values in final dataset")
            
    except Exception as e:
        logger.error(f"GeoJSON conversion failed: {e}")
        raise

if __name__ == "__main__":
    main()