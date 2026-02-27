#!/usr/bin/env python3
"""
IEBC ULTIMATE ENHANCED DATA CLEANER WITH DEEPSEEK CONTEXT INTEGRATION
FULL IMPLEMENTATION - NO CUTS, NO MOCK DATA, COMPLETE INTEGRATION
"""

import pandas as pd
import re
from fuzzywuzzy import process, fuzz
from pathlib import Path
import logging
import json
import unicodedata
from typing import Dict, List, Any, Tuple, Optional
import os
import requests
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# File paths
INPUT_CSV = Path("scripts/data/processed/raw_iebc_offices.csv")
OUTPUT_CSV = Path("scripts/data/processed/enhanced_cleaned_iebc_offices.csv")
QUERIES_CACHE = Path("scripts/data/processed/geocode_queries.json")
DEEPSEEK_CONTEXT_DIR = Path("D:/CEKA/RECALL254/scripts/data/processed")

# DeepSeek API Configuration
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"

# Canonical Kenya counties - EXPANDED AND CORRECTED
CANONICAL_COUNTIES = [
    "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita Taveta", 
    "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Meru", 
    "Tharaka Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua", 
    "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot", 
    "Samburu", "Trans Nzoia", "Uasin Gishu", "Elgeyo Marakwet", "Nandi", 
    "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho", 
    "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", 
    "Kisumu", "Homa Bay", "Migori", "Kisii", "Nyamira", "Nairobi City"
]

# ULTIMATE ENHANCED direction patterns
DIRECTION_PATTERNS = {
    'near': r'\b(near|close to|adjacent to|beside|by|at)\b',
    'opposite': r'\b(opposite|across from|facing)\b', 
    'behind': r'\b(behind|at the back of|rear of)\b',
    'next_to': r'\b(next to|beside|adjacent)\b',
    'within': r'\b(within|inside|in)\b',
    'along': r'\b(along|on)\b',
    'between': r'\b(between)\b',
    'at': r'\b(at)\b',
    'towards': r'\b(towards|to|toward|down)\b',
    'from': r'\b(from)\b'
}

# COMPREHENSIVE Landmark types with EXPANDED categories
LANDMARK_TYPES = {
    'government': [
        'dcs office', 'dc compound', 'd.c compound', 'dc administration', 'dos office', 
        'dc office', 'cdf office', 'nhif office', 'administration', 'government', 
        'ministry', 'ministry of roads', 'ministry of public works', 'ministry of social services',
        'ministry of roads offices', 'law courts', 'union offices', 'cdf offices',
        'corporation of kenya', 'national cereals board', 'national cereals&produce board',
        'cereals board', 'national cereals and produce board', 'offices', 'ministry of public works',
        'ministry of social services', 'registration of persons office', 'district headquarters',
        'ddo office', 'postal corporation', 'post office', 'chief camp', 'sub county office',
        'county assembly', 'ward office', 'iebc office', 'electoral office'
    ],
    'police': [
        'police station', 'police post', 'ap post', 'administrative police', 'police', 'ap line',
        'central police station', 'police patrol base', 'ap', 'administration police', 'police headquarters'
    ],
    'education': [
        'school', 'college', 'institute', 'university', 'secondary', 'primary', 'high school',
        'institute of technology', 'school of aviation', 'training centre', 'catholic institute',
        'secondary school', 'primary school', 'boys sec school', 'girls sec school', 'technical institute',
        'coast institute of technology', 'teachers college', 'school for the blind', 'academy',
        'polytechnic', 'training center', 'educational centre'
    ],
    'health': [
        'hospital', 'district hospital', 'health center', 'clinic', 'dispensary', 'medical', 'nhif office',
        'health centre', 'medical centre', 'health facility', 'maternity', 'pharmacy', 'medical clinic'
    ],
    'religious': [
        'church', 'mosque', 'cathedral', 'temple', 'mission', 'parish', 'catholic church', 
        'quakers', 'friends church', 'pag church', 'building', 'methodist church', 'catholic mission',
        'ack church', 'st johns ack church', 'yearly meeting of friends church', 'friends church quakers',
        'anglican church', 'presbyterian church', 'pentecostal church', 'synagogue', 'shrine'
    ],
    'commercial': [
        'market', 'mkt', 'shopping centre', 'shopping center', 'mall', 'supermarket', 'hotel', 
        'bank', 'equity bank', 'national bank', 'savings and credit co-operative society', 
        'market center', 'plaza', 'bldg', 'building', 'stage', 'house', 'block', 'town centre',
        'nakumart', 'naivas supermarket', 'sacco', 'villa', 'resort', 'restaurant', 'barclays', 'kcb',
        'co-operative bank', 'petrol station', 'service station', 'safaricom booster', 'booster',
        'east mart supermarket', 'kenya commercial bank', 'k-unity house', 'best west building',
        'mapa house', 'mappa house', 'senate hotel', 'vision plaza', 'shopping center', 'mall',
        'hotel', 'resort', 'petrol station', 'service station', 'safaricom booster', 'booster',
        'co-operative bank', 'equity bank', 'national bank', 'barclays', 'kcb', 'sacco',
        'growers sacco', 'k-unity', 'best west', 'east view building', 'hennsolex building',
        'farming system building', 'olive inn', 'rhythms college', 'west bank villa', 'commercial bank',
        'family bank', 'stanbic bank', 'absa bank', 'dtb bank', 'nic bank', 'housing finance',
        'sidian bank', 'grocery', 'wholesale', 'retail', 'shop', 'stores', 'business center'
    ],
    'transport': [
        'stage', 'bus stop', 'railway station', 'matatu stage', 'road', 'junction', 'ap line',
        'railway', 'station', 'matatu', 'bus stage', 'main road', 'highway', 'airport', 'airstrip',
        'taxi stand', 'train station', 'lorry park', 'transport stage'
    ],
    'community': [
        'social hall', 'community center', 'youth office', 'town hall', 'hall', 'house',
        'village', 'township', 'apartment', 'villa', 'multipurpose', 'community centre',
        'town hall', 'social hall', 'youth office', 'maendeleo hall', 'cultural center',
        'village office', 'community hall', 'development office', 'civic center'
    ],
    'place': [
        'road', 'village', 'town', 'service station', 'integrated', 'resort', 'institute', 
        'catholic institute', 'institute of technology', 'irrigation scheme', 'office', 
        'baobab tree', 'information block', 'booster', 'safaricom booster', 'plaza', 
        'township', 'sacco', 'training centre', 'corporation of kenya', 'national cereals board', 
        'quakers', 'friends church', 'pag church', 'national cereals and produce board', 
        'cereals board', 'mkt', 'ap line', 'ministry of roads offices', 'ministry of roads', 
        'law courts', 'multipurpose', 'union offices', 'ministry of public works', 
        'ministry of social services', 'apartment', 'cdf offices', 'villa', 'nakumart', 
        'school of aviation', 'naivas supermarket', 'kie-ngara', 'kie ngara', 'al furqan', 
        'alfurqan', 'mamba village', 'links road', 'baobab', 'service', 'station', 
        'integrated', 'technology', 'scheme', 'tree', 'block', 'training', 'centre',
        'center', 'village', 'town', 'road', 'plaza', 'apartment', 'villa', 'supermarket',
        'godown', 'railway', 'station', 'estate', 'compound', 'building', 'complex',
        'shopping centre', 'shopping center', 'market centre', 'trading centre',
        'rural training centre', 'district hqs', 'fire station', 'cooperative building',
        'scripture mission', 'alfurqan integrated', 'sugar belt union offices',
        'coast institute of technology', 'masai rural training centre', 'urban area',
        'rural area', 'settlement', 'location', 'sub location', 'division', 'zone'
    ]
}

# ULTIMATE Map noisy tokens/abbreviations to canonical forms
LANDMARK_ALIASES = {
    r'\bploice\b': 'police',
    r'\bsafari com\b': 'safaricom',
    r'\bmkt\b': 'market',
    r'\bMkt\b': 'market',
    r'&': 'and',
    r'\bNaivas\b': 'naivas supermarket',
    r'\bNakumart\b': 'nakumart',
    r'\bKie[-\s]?Ngara\b': 'kie-ngara',
    r'\bAl Furqan\b': 'al furqan',
    r'\bAP Line\b': 'ap line',
    r'\bNCPB\b': 'national cereals board',
    r'\bNairobi City\b': 'nairobi',
    r'\bD\.?C\.?\b': 'dc',
    r'\bC\.?D\.?F\.?\b': 'cdf',
    r'\bN\.?H\.?I\.?F\.?\b': 'nhif',
    r'\bP\.?A\.?G\.?\b': 'pag',
    r'\bS\.?A\.?C\.?C\.?O\.?\b': 'sacco',
    r'\bK\.?C\.?B\.?\b': 'kcb',
    r'\bBldg\.?\b': 'building',
    r'\bAve\.?\b': 'avenue',
    r'\bSt\.?\b': 'street',
    r'\bRd\.?\b': 'road',
    r'\bGodown\s*No\.?\s*(\d+)\b': r'godown \1',
    r'\bNo\.?\s*(\d+)\b': r'\1',
    r'\bSec\.?\b': 'secondary',
    r'\bSch\.?\b': 'school',
    r'\bHosp\.?\b': 'hospital',
    r'\bDept\.?\b': 'department',
    r'\bGovt\.?\b': 'government',
    r'\bMin\.?\b': 'ministry',
    r'\bAve\b': 'avenue',
    r'\bBlvd\b': 'boulevard',
    r'\bDr\b': 'drive',
    r'\bLn\b': 'lane',
    r'\bCtr\b': 'center',
    r'[^\w\s]': ' ',
}

# ULTIMATE Street identifiers for parsing
STREET_IDENTIFIERS = [
    'road', 'rd', 'street', 'st', 'links road', 'avenue', 'ave', 'lane', 
    'drive', 'dr', 'highway', 'way', 'link', 'link road', 'ngong', 'hospital road',
    'mombasa road', 'lamu road', 'makaburini rd', 'molim road', 'kassim road',
    'kericho kisumu highway', 'bomet narok highway', 'boulevard', 'court',
    'circle', 'crescent', 'place', 'square', 'terrace', 'view', 'ridge',
    'estate', 'village', 'center', 'centre', 'complex', 'plaza', 'mall'
]

# DEEPSEEK INTEGRATION FUNCTIONS
def safe_string(value, default=""):
    """ULTIMATE SAFE: Convert any value to string with guaranteed non-empty default"""
    if value is None:
        return default
    
    try:
        if pd.isna(value):
            return default
    except (TypeError, ValueError):
        pass
    
    if isinstance(value, (list, tuple)):
        return ', '.join(str(v) for v in value if v is not None and not pd.isna(v))
    
    try:
        result = str(value).strip()
        return result if result else default
    except (TypeError, ValueError):
        return default

def safe_float(value, default=0.0):
    """ULTIMATE SAFE: Convert any value to float with guaranteed default"""
    if value is None:
        return default
    try:
        if pd.isna(value):
            return default
    except (TypeError, ValueError):
        pass
    
    try:
        return float(value)
    except (ValueError, TypeError):
        return default

def normalize_text(text: str) -> str:
    """ULTIMATE NORMALIZATION: Advanced text normalization"""
    if not text:
        return ""
    
    text = safe_string(text).lower()
    
    # Unicode normalize to remove accents
    text = unicodedata.normalize("NFKD", text)
    
    # Apply aliases
    for pattern, replacement in LANDMARK_ALIASES.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    
    # Remove excessive punctuation but keep hyphens and basic separators
    text = re.sub(r'[^\w\s\-]', ' ', text)
    
    # Collapse multiple spaces
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def fuzzy_keyword_match(text: str, keywords: List[str], threshold: int = 80) -> Tuple[Optional[str], int]:
    """ULTIMATE FUZZY MATCH: Advanced fuzzy matching with multiple strategies"""
    if not text or not keywords:
        return None, 0
    
    # First try exact substring matching
    for keyword in keywords:
        if keyword in text:
            return keyword, 100
    
    # Then try fuzzy matching with multiple strategies
    best_match, best_score = process.extractOne(text, keywords, scorer=fuzz.partial_ratio)
    if best_score >= threshold:
        return best_match, best_score
    
    # Token set ratio as fallback
    best_match, best_score = process.extractOne(text, keywords, scorer=fuzz.token_set_ratio)
    if best_score >= threshold:
        return best_match, best_score
    
    return None, 0

def extract_distance(text: str) -> Tuple[str, str]:
    """ULTIMATE DISTANCE EXTRACTION: Advanced distance parsing"""
    distance_patterns = [
        r'(\d+(?:\.\d+)?)\s*(m|meters?|metres?)\b',
        r'(\d+(?:\.\d+)?)\s*(km|kilometers?|kilometres?)\b',
        r'(\d+(?:\.\d+)?)\s*(kms?)\b',
        r'(\d+)\s*(meter|metre)s?\b',
        r'(\d+)\s*(kilometer|kilometre)s?\b',
    ]
    
    for pattern in distance_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            distance = f"{match.group(1)}{match.group(2)}"
            cleaned_text = re.sub(pattern, '', text, flags=re.IGNORECASE).strip()
            cleaned_text = re.sub(r'\b(from|of|the|about|approximately)\b', '', cleaned_text).strip()
            cleaned_text = re.sub(r'\s+', ' ', cleaned_text)
            return cleaned_text, distance
    
    return text, ""

def parse_compound_directions(text: str) -> Dict[str, Any]:
    """ULTIMATE COMPOUND PARSING: Advanced directional instruction parsing"""
    directions = []
    landmarks = []
    
    # Split by commas and conjunctions for sequential directions
    parts = [part.strip() for part in re.split(r',|\band\b|\bthen\b', text) if part.strip()]
    
    for part in parts:
        # Check for each direction type
        for direction_type, pattern in DIRECTION_PATTERNS.items():
            match = re.search(pattern, part, re.IGNORECASE)
            if match:
                # Split around the direction word
                dir_parts = re.split(pattern, part, flags=re.IGNORECASE, maxsplit=1)
                if len(dir_parts) >= 3:
                    landmark = dir_parts[2].strip()
                    # Enhanced cleaning
                    landmark = re.sub(r'^[,\s.-]+|[,\s.-]+$', '', landmark)
                    landmark = re.sub(r'\b(the|a|an)\b', '', landmark, flags=re.IGNORECASE).strip()
                    if landmark and len(landmark) > 2:
                        directions.append(direction_type)
                        landmarks.append(landmark)
                break
    
    return {
        'directions': directions,
        'landmarks': landmarks,
        'is_compound': len(directions) > 1
    }

def intelligent_address_parser(office_location: str, constituency_name: str, county_name: str = "") -> Dict[str, Any]:
    """
    ULTIMATE ENHANCED PARSER: Advanced parsing with context awareness
    """
    office_location = safe_string(office_location)
    constituency_name = safe_string(constituency_name, "Unknown Constituency")
    county_name = safe_string(county_name)
    
    if not office_location:
        return {
            'clean_office_location': constituency_name,
            'direction_type': '',
            'direction_landmark': '',
            'direction_distance': '',
            'landmark_type': 'unclassified',
            'landmark_subtype': '',
            'area': constituency_name,
            'street': '',
            'parsed_landmark': constituency_name,
            'is_compound': False,
            'compound_directions': [],
            'compound_landmarks': [],
            'parsed_with_context': False,
            'parsing_confidence': 0.0
        }
    
    original_text = office_location
    text = normalize_text(office_location)
    
    # Initialize components with enhanced fields
    components = {
        'clean_office_location': original_text,
        'direction_type': '',
        'direction_landmark': '',
        'direction_distance': '',
        'landmark_type': 'unclassified',
        'landmark_subtype': '',
        'area': '',
        'street': '',
        'parsed_landmark': '',
        'is_compound': False,
        'compound_directions': [],
        'compound_landmarks': [],
        'parsed_with_context': False,
        'parsing_confidence': 0.0
    }
    
    # Extract distance first
    text, distance = extract_distance(text)
    if distance:
        components['direction_distance'] = distance
    
    # Parse compound directions
    compound_info = parse_compound_directions(text)
    components.update(compound_info)
    
    # Enhanced primary landmark extraction
    if compound_info['is_compound'] and compound_info['landmarks']:
        components['direction_type'] = compound_info['directions'][0]
        components['direction_landmark'] = compound_info['landmarks'][0]
        primary_landmark = compound_info['landmarks'][0]
    else:
        # Advanced single direction parsing
        for direction_type, pattern in DIRECTION_PATTERNS.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                components['direction_type'] = direction_type
                parts = re.split(pattern, text, flags=re.IGNORECASE, maxsplit=1)
                if len(parts) >= 3:
                    clean_part = parts[0].strip()
                    landmark_part = parts[2].strip()
                    
                    # Enhanced cleaning
                    clean_part = re.sub(r'^[,\s.-]+|[,\s.-]+$', '', clean_part)
                    landmark_part = re.sub(r'^[,\s.-]+|[,\s.-]+$', '', landmark_part)
                    
                    if not clean_part:
                        clean_part = constituency_name
                    
                    components['clean_office_location'] = clean_part
                    components['direction_landmark'] = landmark_part
                    primary_landmark = landmark_part
                break
        else:
            # No direction found, use entire text as clean location
            components['clean_office_location'] = text
            primary_landmark = text
    
    # Enhanced area and street parsing
    clean_loc = components['clean_office_location']
    
    # Advanced street identification
    street_found = False
    for street_id in STREET_IDENTIFIERS:
        street_pattern = rf'\b{re.escape(street_id)}\b'
        if re.search(street_pattern, clean_loc.lower()):
            # Split at the street identifier
            parts = re.split(street_pattern, clean_loc.lower(), 1, flags=re.IGNORECASE)
            if len(parts) == 2:
                area_part = parts[0].strip()
                street_part = f"{street_id}{parts[1].strip()}"
                
                components['area'] = area_part.title() if area_part else constituency_name
                components['street'] = street_part.title()
                street_found = True
                break
    
    if not street_found:
        # Enhanced area detection
        components['area'] = constituency_name
        if clean_loc != constituency_name:
            components['street'] = clean_loc.title()
    
    # ULTIMATE Landmark classification with multiple strategies
    classification_text = ' '.join([
        components['direction_landmark'],
        components['clean_office_location'],
        original_text,
        county_name,
        constituency_name
    ])
    
    classification_text_norm = normalize_text(classification_text)
    best_type = 'unclassified'
    best_subtype = ''
    best_score = 0
    
    # Multi-strategy classification
    for landmark_type in ['government', 'police', 'education', 'health', 'religious', 'commercial', 'transport', 'community', 'place']:
        keywords = LANDMARK_TYPES[landmark_type]
        
        # Strategy 1: Direct substring matching
        for keyword in keywords:
            if keyword in classification_text_norm:
                best_type = landmark_type
                best_subtype = keyword
                best_score = 100
                break
        
        if best_score == 100:
            break
        
        # Strategy 2: Fuzzy matching
        match, score = fuzzy_keyword_match(classification_text_norm, keywords, threshold=75)
        if match and score > best_score:
            best_type = landmark_type
            best_subtype = match
            best_score = score
    
    components['landmark_type'] = best_type
    components['landmark_subtype'] = best_subtype
    components['parsing_confidence'] = best_score / 100.0
    
    # Enhanced parsed landmark creation
    if components['direction_type'] and components['direction_landmark']:
        if components['direction_distance']:
            components['parsed_landmark'] = f"{components['direction_type']} {components['direction_landmark']} {components['direction_distance']}"
        else:
            components['parsed_landmark'] = f"{components['direction_type']} {components['direction_landmark']}"
    else:
        components['parsed_landmark'] = components['clean_office_location']
    
    # Final enhanced cleanup
    components['clean_office_location'] = re.sub(r'^[,\s]+|[,\s]+$', '', components['clean_office_location'])
    components['direction_landmark'] = re.sub(r'^[,\s]+|[,\s]+$', '', components['direction_landmark'])
    
    if not components['clean_office_location']:
        components['clean_office_location'] = constituency_name
    
    # Capitalize for output
    components['clean_office_location'] = components['clean_office_location'].title()
    components['direction_landmark'] = components['direction_landmark'].title()
    components['area'] = components['area'].title()
    components['street'] = components['street'].title()
    components['parsed_landmark'] = components['parsed_landmark'].title()
    
    return components

def create_advanced_geocode_queries(row: Dict[str, Any]) -> List[str]:
    """
    ULTIMATE QUERY BUILDER: Creates multiple optimized geocoding queries with permutations
    """
    constituency = safe_string(row['constituency_name'], "Unknown Constituency")
    county = safe_string(row['county'], "Unknown County")
    clean_location = safe_string(row['clean_office_location'])
    direction_landmark = safe_string(row['direction_landmark'])
    landmark_subtype = safe_string(row.get('landmark_subtype', ''))
    area = safe_string(row.get('area', ''))
    street = safe_string(row.get('street', ''))
    direction_type = safe_string(row['direction_type'])
    original_location = safe_string(row['office_location'])
    is_compound = row.get('is_compound', False)
    compound_landmarks = row.get('compound_landmarks', [])
    
    queries = []
    
    # Use landmark_subtype if available, otherwise use direction_landmark
    effective_landmark = landmark_subtype or direction_landmark
    
    # STRATEGY 1: Compound direction queries (highest priority for complex cases)
    if is_compound and compound_landmarks:
        for landmark in compound_landmarks:
            landmark_query = f"{landmark}, {constituency}, {county} County, Kenya"
            queries.append(landmark_query)
        
        if len(compound_landmarks) >= 2:
            combined_query = f"{compound_landmarks[0]} and {compound_landmarks[1]}, {constituency}, {county} County, Kenya"
            queries.append(combined_query)
    
    # STRATEGY 2: Full location with landmark permutations
    if clean_location and effective_landmark:
        if direction_type in ['near', 'at', 'within', 'opposite', 'behind', 'next_to']:
            full_query1 = f"{clean_location} {effective_landmark}, {constituency}, {county} County, Kenya"
            queries.append(full_query1)
            
            full_query2 = f"{effective_landmark} {clean_location}, {constituency}, {county} County, Kenya"
            queries.append(full_query2)
            
            full_query3 = f"{clean_location} {direction_type} {effective_landmark}, {constituency}, {county} County, Kenya"
            queries.append(full_query3)
        else:
            # For other direction types or no direction
            full_query = f"{clean_location}, {effective_landmark}, {constituency}, {county} County, Kenya"
            queries.append(full_query)
    
    # STRATEGY 3: Landmark-focused queries
    if effective_landmark:
        landmark_query1 = f"{effective_landmark}, {constituency}, {county} County, Kenya"
        queries.append(landmark_query1)
        
        if area and area != constituency:
            landmark_query2 = f"{effective_landmark}, {area}, {county} County, Kenya"
            queries.append(landmark_query2)
    
    # STRATEGY 4: Street and area based queries
    if street:
        street_query1 = f"{street}, {area}, {county} County, Kenya"
        queries.append(street_query1)
        
        street_query2 = f"{street}, {constituency}, {county} County, Kenya"
        queries.append(street_query2)
    
    # STRATEGY 5: Clean location permutations
    if clean_location and clean_location != constituency:
        location_query1 = f"{clean_location}, {constituency}, {county} County, Kenya"
        queries.append(location_query1)
        
        if area and area != clean_location:
            location_query2 = f"{clean_location}, {area}, {county} County, Kenya"
            queries.append(location_query2)
    
    # STRATEGY 6: Original location as fallback
    if original_location and original_location != clean_location:
        original_query = f"{original_location}, {constituency}, {county} County, Kenya"
        queries.append(original_query)
    
    # STRATEGY 7: Constituency center (fallback)
    constituency_query = f"{constituency}, {county} County, Kenya"
    queries.append(constituency_query)
    
    # STRATEGY 8: County center (final fallback)
    county_query = f"{county} County, Kenya"
    queries.append(county_query)
    
    # Enhanced duplicate removal and cleaning
    valid_queries = []
    for q in queries:
        cleaned_q = re.sub(r'^[,\s]+', '', q.strip())
        cleaned_q = re.sub(r'\s+', ' ', cleaned_q)
        cleaned_q = re.sub(r',+', ',', cleaned_q)
        
        # Apply additional normalization
        cleaned_q = re.sub(r'\bGodown\s+No\.?\s*(\d+)', r'Godown \1', cleaned_q, flags=re.IGNORECASE)
        cleaned_q = re.sub(r'\bNo\.?\s*(\d+)', r'\1', cleaned_q, flags=re.IGNORECASE)
        
        if cleaned_q and len(cleaned_q) > 10 and cleaned_q not in valid_queries:
            valid_queries.append(cleaned_q)
    
    return valid_queries

def canonicalize_county(county_name):
    """ULTIMATE COUNTY CANONICALIZATION: Advanced county name standardization"""
    county_name = safe_string(county_name)
    if not county_name:
        return "Unknown County"
    
    # Direct matching first
    if county_name in CANONICAL_COUNTIES:
        return county_name
    
    # Enhanced common corrections
    corrections = {
        "Kirili": "Kilifi", "Marshall": "Marsabit", "Talia Taveta": "Taita Taveta",
        "Thanaka": "Tharaka Nithi", "Erribu": "Embu", "Kirtai": "Kitui",
        "Nyandama": "Nyandarua", "Kambu": "Kiambu", "Makuru": "Nakuru",
        "Narcék": "Narok", "Bornet": "Bomet", "Kitumu": "Kisumu",
        "Myanmar": "Nyamira", "Narooli City": "Nairobi", "Elgeyo": "Elgeyo Marakwet",
        "Narobi": "Nairobi", "Mombasa City": "Mombasa", "Kisumu City": "Kisumu",
        "Nakuru Town": "Nakuru", "Eldoret": "Uasin Gishu"
    }
    if county_name in corrections:
        return corrections[county_name]
    
    # Enhanced fuzzy matching
    best_match, score = process.extractOne(county_name, CANONICAL_COUNTIES, scorer=fuzz.token_sort_ratio)
    if score >= 80:
        return best_match
    
    return county_name

def clean_constituency_name(name):
    """ULTIMATE CONSTITUENCY CLEANING: Advanced constituency name standardization"""
    name = safe_string(name)
    if not name:
        return "Unknown Constituency"
    
    # Enhanced common corrections
    corrections = {
        "Jomyu": "Jomvu", "Kisami": "Kisauni", "Ildoni": "Likoni", 
        "Myita": "Mvita", "Masanbeeni": "Msambweni", "Mutuga": "Matuga",
        "Kalokori": "Kaloleni", "Babai": "Baba Doge", "Gante": "Ganze",
        "Bulindi": "Bura", "Magazini": "Magarini", "Sarisen": "Bura",
        "Galoka": "Galole", "Bara": "Bura", "Marakwet Box": "Marakwet",
        "West Pokit": "West Pokot", "Trans Zonia": "Trans Nzoia",
        "Uasin Gish": "Uasin Gishu", "Elgeyo Marakwet": "Elgeyo Marakwet",
        "Tharaka": "Tharaka Nithi", "Muranga": "Murang'a"
    }
    if name in corrections:
        return corrections[name]
    
    # Title case and clean
    name = name.title()
    name = re.sub(r'\s+', ' ', name)
    return name

def load_context_files():
    """Load and process CONTEXT files for enhanced parsing"""
    context_data = {}
    
    if not DEEPSEEK_CONTEXT_DIR.exists():
        logger.warning(f"Context directory not found: {DEEPSEEK_CONTEXT_DIR}")
        return context_data
    
    try:
        context_files = list(DEEPSEEK_CONTEXT_DIR.glob("CONTEXT*.txt"))
        logger.info(f"Found {len(context_files)} context files")
        
        for context_file in context_files:
            try:
                with open(context_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                context_data[context_file.name] = content
                logger.info(f"Loaded context: {context_file.name} ({len(content)} chars)")
            except Exception as e:
                logger.warning(f"Failed to load {context_file}: {e}")
        
    except Exception as e:
        logger.error(f"Error loading context files: {e}")
    
    return context_data

def enhance_with_context(row: Dict[str, Any], context_data: Dict[str, str]) -> Dict[str, Any]:
    """Enhance row data with context information"""
    enhanced_row = row.copy()
    
    # Extract key identifiers for context matching
    constituency = safe_string(row.get('constituency_name', ''))
    county = safe_string(row.get('county', ''))
    location = safe_string(row.get('office_location', ''))
    
    # Simple context matching - look for mentions in context files
    for context_file, content in context_data.items():
        content_lower = content.lower()
        
        # Check for constituency mentions
        if constituency.lower() in content_lower:
            enhanced_row['context_matches'] = enhanced_row.get('context_matches', [])
            enhanced_row['context_matches'].append({
                'file': context_file,
                'type': 'constituency',
                'match': constituency
            })
        
        # Check for county mentions
        if county.lower() in content_lower:
            enhanced_row['context_matches'] = enhanced_row.get('context_matches', [])
            enhanced_row['context_matches'].append({
                'file': context_file,
                'type': 'county',
                'match': county
            })
        
        # Check for location mentions (partial matches)
        location_words = location.lower().split()
        for word in location_words:
            if len(word) > 3 and word in content_lower:
                enhanced_row['context_matches'] = enhanced_row.get('context_matches', [])
                enhanced_row['context_matches'].append({
                    'file': context_file,
                    'type': 'location_keyword',
                    'match': word
                })
    
    return enhanced_row

def enhance_office_data(df):
    """ULTIMATE ENHANCED DATA PROCESSING: Main data enhancement function"""
    logger.info("Starting ULTIMATE ENHANCED data processing with DeepSeek context integration...")
    
    # Load context files
    context_data = load_context_files()
    
    # Ensure all columns are strings and handle NaN
    for col in df.columns:
        df[col] = df[col].apply(lambda x: safe_string(x))
    
    # Enhanced county name canonicalization
    logger.info("Enhanced county name canonicalization...")
    df['county'] = df['county'].apply(canonicalize_county)
    
    # Enhanced constituency name cleaning
    logger.info("Enhanced constituency name cleaning...")
    df['constituency_name'] = df['constituency_name'].apply(clean_constituency_name)
    
    # ULTIMATE ENHANCED: Parse direction components with context integration
    logger.info("ULTIMATE ENHANCED parsing with context integration...")
    direction_data = df.apply(
        lambda row: intelligent_address_parser(
            row['office_location'], 
            row['constituency_name'],
            row['county']
        ), 
        axis=1
    )
    
    # Add direction components to dataframe
    df['clean_office_location'] = direction_data.apply(lambda x: x['clean_office_location'])
    df['direction_type'] = direction_data.apply(lambda x: x['direction_type'])
    df['direction_landmark'] = direction_data.apply(lambda x: x['direction_landmark'])
    df['direction_distance'] = direction_data.apply(lambda x: x['direction_distance'])
    df['landmark_type'] = direction_data.apply(lambda x: x['landmark_type'])
    df['landmark_subtype'] = direction_data.apply(lambda x: x.get('landmark_subtype', ''))
    df['area'] = direction_data.apply(lambda x: x.get('area', ''))
    df['street'] = direction_data.apply(lambda x: x.get('street', ''))
    df['parsed_landmark'] = direction_data.apply(lambda x: x.get('parsed_landmark', ''))
    df['is_compound'] = direction_data.apply(lambda x: x.get('is_compound', False))
    df['compound_directions'] = direction_data.apply(lambda x: x.get('compound_directions', []))
    df['compound_landmarks'] = direction_data.apply(lambda x: x.get('compound_landmarks', []))
    df['parsing_confidence'] = direction_data.apply(lambda x: x.get('parsing_confidence', 0.0))
    
    # Enhanced context integration
    logger.info("Integrating context data...")
    enhanced_rows = []
    for idx, row in df.iterrows():
        enhanced_row = enhance_with_context(row.to_dict(), context_data)
        enhanced_rows.append(enhanced_row)
    
    df = pd.DataFrame(enhanced_rows)
    
    # Ensure landmark and distance fields have values
    df['landmark'] = df.apply(
        lambda row: safe_string(row['landmark']) or safe_string(row['direction_landmark']), 
        axis=1
    )
    df['distance_from_landmark'] = df.apply(
        lambda row: safe_string(row['distance_from_landmark']) or safe_string(row['direction_distance']), 
        axis=1
    )
    
    # Enhanced distance format standardization
    logger.info("Enhanced distance format standardization...")
    df['distance_from_landmark'] = df['distance_from_landmark'].apply(
        lambda x: re.sub(r'(\d)\s*(m|M|meters?|metres?)', r'\1m', safe_string(x)))
    df['distance_from_landmark'] = df['distance_from_landmark'].apply(
        lambda x: re.sub(r'(\d)\s*(km|Km|kilometers?)', r'\1km', safe_string(x)))
    
    # ULTIMATE ENHANCED: Create advanced geocoding queries
    logger.info("ULTIMATE ENHANCED geocoding query generation...")
    df['geocode_queries'] = df.apply(create_advanced_geocode_queries, axis=1)
    
    # Also create primary query for compatibility
    df['geocode_query'] = df['geocode_queries'].apply(lambda x: x[0] if x else "")
    
    # ENHANCED QUALITY FILTERING - SAFE VERSION
    initial_count = len(df)
    
    # More permissive filtering to avoid removing all rows
    quality_mask = (
        df['clean_office_location'].notna() & 
        (df['clean_office_location'].str.len() > 3) &
        df['constituency_name'].notna() &
        (df['constituency_name'].str.len() > 3)
    )
    
    df = df[quality_mask].copy()
    final_count = len(df)
    
    removed_count = initial_count - final_count
    logger.info(f"Quality filtering: {removed_count} rows removed, {final_count} high-quality rows remaining")
    
    # Save enhanced queries for reference
    queries_data = {}
    for idx, row in df.iterrows():
        queries_data[f"{row['constituency_name']}_{idx}"] = {
            'primary_query': row['geocode_query'],
            'all_queries': row['geocode_queries'],
            'original_location': safe_string(row['office_location']),
            'clean_location': safe_string(row['clean_office_location']),
            'landmark': safe_string(row['direction_landmark']),
            'landmark_type': safe_string(row['landmark_type']),
            'landmark_subtype': safe_string(row['landmark_subtype']),
            'area': safe_string(row['area']),
            'street': safe_string(row['street']),
            'direction_type': safe_string(row['direction_type']),
            'is_compound': row.get('is_compound', False),
            'compound_landmarks': row.get('compound_landmarks', []),
            'parsing_confidence': row.get('parsing_confidence', 0.0),
            'context_matches': row.get('context_matches', [])
        }
    
    QUERIES_CACHE.parent.mkdir(parents=True, exist_ok=True)
    with open(QUERIES_CACHE, 'w', encoding='utf-8') as f:
        json.dump(queries_data, f, indent=2, ensure_ascii=False)
    
    # Enhanced sample logging
    logger.info("=== ULTIMATE ENHANCED SAMPLE PROCESSED DATA ===")
    sample_count = min(8, len(df))
    for i in range(sample_count):
        row = df.iloc[i]
        logger.info(f"  {i+1}. Original: '{row['office_location']}'")
        logger.info(f"     Cleaned: '{row['clean_office_location']}'")
        logger.info(f"     Direction: {row['direction_type']} '{row['direction_landmark']}'")
        logger.info(f"     Landmark Type: {row['landmark_type']} -> {row['landmark_subtype']}")
        logger.info(f"     Area: '{row['area']}', Street: '{row['street']}'")
        logger.info(f"     Compound: {row['is_compound']} {row['compound_landmarks']}")
        logger.info(f"     Confidence: {row.get('parsing_confidence', 0.0):.1%}")
        logger.info(f"     Primary Query: '{row['geocode_query']}'")
        logger.info(f"     Total Queries: {len(row['geocode_queries'])}")
        logger.info(f"     Context Matches: {len(row.get('context_matches', []))}")
        logger.info(f"     ---")
    
    return df

def main():
    """ULTIMATE ENHANCED main function"""
    logger.info("Starting ULTIMATE ENHANCED data processing with DeepSeek context integration...")
    
    if not INPUT_CSV.exists():
        logger.error(f"Input file not found: {INPUT_CSV}")
        return
    
    try:
        # Load raw IEBC data
        df = pd.read_csv(INPUT_CSV)
        logger.info(f"Loaded {len(df)} raw rows")
        
        # Enhance data with ULTIMATE parsing
        enhanced_df = enhance_office_data(df)
        
        # Save enhanced data
        OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
        enhanced_df.to_csv(OUTPUT_CSV, index=False, encoding='utf-8')
        logger.info(f"Successfully enhanced {len(enhanced_df)} rows to {OUTPUT_CSV}")
        
        # ULTIMATE ENHANCED comprehensive summary
        logger.info("=== ULTIMATE ENHANCED DATA SUMMARY ===")
        
        # SAFE SUMMARY CALCULATIONS - NO DIVISION BY ZERO
        total_rows = len(enhanced_df)
        
        if total_rows == 0:
            logger.warning("⚠️ No enhanced rows available for summary")
            return
        
        county_summary = enhanced_df['county'].value_counts()
        logger.info("Enhanced county distribution:")
        for county, count in county_summary.head(10).items():
            logger.info(f"  {county}: {count}")
        
        direction_summary = enhanced_df['direction_type'].value_counts()
        logger.info("Enhanced direction type distribution:")
        for direction, count in direction_summary.items():
            logger.info(f"  {direction}: {count}")
        
        landmark_summary = enhanced_df['landmark_type'].value_counts()
        logger.info("Enhanced landmark type distribution:")
        for landmark, count in landmark_summary.items():
            logger.info(f"  {landmark}: {count}")
        
        compound_summary = enhanced_df['is_compound'].value_counts()
        logger.info("Enhanced compound direction distribution:")
        for compound, count in compound_summary.items():
            logger.info(f"  {compound}: {count}")
        
        # Enhanced region classification
        region_classification = enhanced_df.groupby(['county', 'landmark_type']).size().unstack(fill_value=0)
        logger.info("Enhanced region classification distribution:")
        for county in region_classification.index[:5]:
            logger.info(f"  {county}: {region_classification.loc[county].to_dict()}")
        
        # Enhanced query quality metrics
        avg_queries = enhanced_df['geocode_queries'].apply(len).mean()
        total_queries = enhanced_df['geocode_queries'].apply(len).sum()
        unclassified_count = len(enhanced_df[enhanced_df['landmark_type'] == 'unclassified'])
        high_confidence_count = len(enhanced_df[enhanced_df['parsing_confidence'] >= 0.9])
        
        # SAFE RATIO CALCULATIONS
        high_confidence_ratio = high_confidence_count / total_rows * 100 if total_rows > 0 else 0
        unclassified_ratio = unclassified_count / total_rows * 100 if total_rows > 0 else 0
        
        logger.info(f"✅ Average queries per office: {avg_queries:.1f}")
        logger.info(f"✅ Total queries generated: {total_queries}")
        logger.info(f"✅ Unclassified landmarks: {unclassified_count} ({unclassified_ratio:.1f}%)")
        logger.info(f"✅ High confidence parsing: {high_confidence_count} ({high_confidence_ratio:.1f}%)")
        
        # Context integration summary
        context_matches = enhanced_df['context_matches'].apply(lambda x: len(x) if isinstance(x, list) else 0).sum()
        logger.info(f"✅ Context matches found: {context_matches}")
        
        # Final NaN check
        nan_count = enhanced_df.isnull().sum().sum()
        if nan_count == 0:
            logger.info("🎉 PERFECT: Zero NaN values in cleaned dataset!")
        else:
            logger.warning(f"⚠️ Found {nan_count} NaN values in dataset")
        
        logger.info(f"💾 Queries cache saved to: {QUERIES_CACHE}")
        logger.info("🚀 ULTIMATE ENHANCED DATA PROCESSING COMPLETE!")
        
    except Exception as e:
        logger.error(f"ULTIMATE ENHANCED data processing failed: {e}")
        raise

if __name__ == "__main__":
    main()