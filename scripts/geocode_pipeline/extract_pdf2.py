#!/usr/bin/env python3
"""
IEBC PDF Data Extraction Script - Enhanced Version
Extracts constituency office data from IEBC PDF into structured CSV
Handles typos, inconsistent formatting, and missing data
"""
import pdfplumber
import re
import csv
import sys
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
PDF_PATH = Path("scripts/data/raw/Physical_Locations_of_Constituency_Offices_in_Kenya_290_Constituencies.pdf")
OUTPUT_CSV = Path("scripts/data/processed/raw_iebc_offices.csv")
COLUMN_HEADERS = ["county", "constituency_code", "constituency_name", "office_location", "landmark", "distance_from_landmark"]

def normalize_whitespace(text):
    """Normalize whitespace in text"""
    if not text or str(text).strip() == '':
        return ''
    return re.sub(r'\s+', ' ', str(text)).strip()

def clean_text(text):
    """Clean and fix common OCR/typo issues"""
    if not text:
        return ""
    
    # Common corrections for typos in the PDF
    corrections = {
        r'\bConsilitvency\b': 'Constituency',
        r'\bConsitluency\b': 'Constituency',
        r'\bIEBC Consitluency\b': 'IEBC Constituency',
        r'\bIBM Constituency\b': 'IEBC Constituency',
        r'\bIBioCommittency\b': 'IEBC Constituency',
        r'\bConfluence of Office\b': 'IEBC Constituency Offices',
        r'\bBasic Constituency Offices\b': 'IEBC Constituency Offices',
        r'\bBasic Country\b': 'Busia County',
        r'\bStaya County\b': 'Siaya County',
        r'\bTalta Tavefa County\b': 'Taita Taveta County',
        r'\bThoraka-Nithi County\b': 'Tharaka-Nithi County',
        r'\bBasin Gishu County\b': 'Uasin Gishu County',
        r'\bEigeyo Marakwet County\b': 'Elgeyo Marakwet County',
        r'\bKajjado County\b': 'Kajiado County',
        r'\bConflicts\b': 'Baringo County',  # This appears to be a header typo
        r'\bflrestation\b': 'firestation',
        r'\bKisouni\b': 'Kisauni',
        r'\bMwita\b': 'Mvita',
        r'\bMathiga\b': 'Matuga',
        r'\bKiliifi\b': 'Kilifi',
        r'\bKilii\b': 'Kilifi',
        r'\bMojengo\b': 'Majengo',
        r'\bMalatu\b': 'Matatu',
        r'\bRabai\b': 'Rabai',
        r'\bShikaadabu\b': 'Shika Adabu',
        r'\bJudo\b': 'Junda',
        r'\bJuvenile Resort\b': 'Mwembe Resort',
        r'\bKab Bank\b': 'KCB Bank',
        r'\bBatambala\b': 'Balambala',
        r'\bMadagashie\b': 'Modogashe',
        r'\bDe\'s Office\b': 'DC\'s Office',
        r'\bWajir North\b': 'Wajir North',
        r'\bGiffthu\b': 'Giriftu',
        r'\bHabsoweln\b': 'Habaswein',
        r'\bRhamu\b': 'Rhamu',
        r'\bMalkamari\b': 'Malkamari',
        r'\bSuflu\b': 'Suftu',
        r'\bLalsamis\b': 'Laisamis',
        r'\bImenii\b': 'Imenti',
        r'\bMorara\b': 'Maara',
        r'\bChukaz/Igambangambe\b': 'Chuka/Igambang\'ombe',
        r'\bThoraka\b': 'Tharaka',
        r'\bManyatita\b': 'Manyatta',
        r'\bRunyerjes\b': 'Runyenjes',
        r'\bKittiti\b': 'Kiritiri',
        r'\bYarita\b': 'Yatta',
        r'\bKilhimani\b': 'Kithimani',
        r'\bTraiming\b': 'Training',
        r'\bMwata\b': 'Mwala',
        r'\bAdjascent\b': 'Adjacent',
        r'\bKatli\b': 'Kaiti',
        r'\bWate\b': 'Wote',
        r'\bKnanpop\b': 'Kinangop',
        r'\bBacy\b': 'Elacy',
        r'\bOf Kalou\b': 'Ol Kalou',
        r'\bOf Jarak\b': 'Ol Jorok',
        r'\bNafa\b': 'Ndia',
        r'\bKenagoya\b': 'Kerugoya',
        r'\bKhanu\b': 'Kiharu',
        r'\bKita-ini\b': 'Kiria-ini',
        r'\bKiambao\b': 'Kiambaa',
        r'\bKabele\b': 'Kabete',
        r'\bGilhunguri\b': 'Githunguri',
        r'\bWrangge\b': 'Wangige',
        r'\bKaperaguta\b': 'Kapenguria',
        r'\bMolben\b': 'Moiben',
        r'\bAinabixoi\b': 'Ainabkoi',
        r'\bBidaret\b': 'Eldoret',
        r'\bEigeyo\b': 'Elgeyo',
        r'\bKapzowar\b': 'Kapsowar',
        r'\bChepkaria\b': 'Chepkorio',
        r'\bChesumel\b': 'Chesumei',
        r'\bCheptari\b': 'Cheptarit',
        r'\bKobujal\b': 'Kobujoi',
        r'\bTichy\b': 'Tiaty',
        r'\bMagalia\b': 'Mogotio',
        r'\bBerestia\b': 'Boresha',
        r'\bNychururu\b': 'Nyahururu',
        r'\bNamyuki\b': 'Nanyuki',
        r'\bDoldal\b': 'Doldol',
        r'\bNjaro\b': 'Njoro',
        r'\bGilgi\b': 'Gilgil',
        r'\bKuresai\b': 'Kuresoi',
        r'\bSubukia\b': 'Subukia',
        r'\bDo\'s\b': 'DC\'s',
        r'\bKamalna\b': 'Kiamaina',
        r'\bKilgaris\b': 'Kilgoris',
        r'\bEmurua Diktir\b': 'Emurua Dikkir',
        r'\bKajjada\b': 'Kajiado',
        r'\bTenebo\b': 'Tenebo',
        r'\bGitis\b': 'Girls',
        r'\bLalbatok\b': 'Loitoktok',
        r'\bBureli\b': 'Bureti',
        r'\bPahras\b': 'Patnas',
        r'\bSain\b': 'Soin',
        r'\bMathiyo\b': 'Mathioyo',
        r'\bChepolungu\b': 'Chepalungu',
        r'\bSolik\b': 'Sotik',
        r'\bLunambi\b': 'Lurambi',
        r'\bDowa\b': 'Dowa',
        r'\bKiwistero\b': 'Khwisero',
        r'\bIkolomomi\b': 'Ikolomani',
        r'\bEabuye\b': 'Esibuye',
        r'\bSisira\b': 'Sisiria',
        r'\bKanduvi\b': 'Kanduyi',
        r'\bBurnula\b': 'Bumula',
        r'\bMya Office\b': 'MP Office',
        r'\bMatayas\b': 'Matayos',
        r'\bFuruya\b': 'Funyula',
        r'\bSovana\b': 'Savana',
        r'\bUsanga\b': 'Usonga',
        r'\bIda Office\b': 'IDS Office',
        r'\bRariedo\b': 'Rarieda',
        r'\bMuharani\b': 'Muhoroni',
        r'\bRawtenge\b': 'Pawtenge',
        r'\bOnafili\b': 'Onditi',
        r'\bQigla\b': 'Ojola',
        r'\bMambaleo\b': 'Mamboleo',
        r'\bNathwa\b': 'Ndhiwa',
        r'\bUrti\b': 'Uriri',
        r'\bNyotike\b': 'Nyatike',
        r'\bMaccalda\b': 'Macalda',
        r'\bKurla\b': 'Kuria',
        r'\bKeopaga\b': 'Kegonga',
        r'\bBanchari\b': 'Bonchari',
        r'\bIlterla\b': 'Itierio',
        r'\bBarabu\b': 'Borabu',
        r'\bKifutu\b': 'Kitutu',
        r'\bKifufu\b': 'Kitutu',
        r'\bEkerenyo\b': 'Ekerenyo',
        r'\bKijauri\b': 'Kijauri',
        r'\bDagoretti\b': 'Dagoretti',
        r'\bMalipasa\b': 'Maliposa',
        r'\bNakumarti\b': 'Nakumatt',
        r'\bRaysambu\b': 'Roysambu',
        r'\bVilla France\b': 'Villa Franca',
        r'\bDG\'s\b': 'DO\'s',
        r'\bMarinare\b': 'Mathare',
    }
    
    text = str(text)
    for pattern, replacement in corrections.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    
    return normalize_whitespace(text)

def extract_county_from_page(text):
    """Extract county name from page text"""
    counties = [
        "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita Taveta", "Garissa",
        "Wajir", "Mandera", "Marsabit", "Isiolo", "Meru", "Tharaka-Nithi", "Embu",
        "Kitui", "Machakos", "Makueni", "Nyandarua", "Nyeri", "Kirinyaga", "Murang'a",
        "Kiambu", "Turkana", "West Pokot", "Samburu", "Trans Nzoia", "Uasin Gishu",
        "Elgeyo Marakwet", "Nandi", "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado",
        "Kericho", "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", "Kisumu",
        "Homa Bay", "Migori", "Kisii", "Nyamira", "Nairobi"
    ]
    
    text = text.upper()
    for county in counties:
        if county.upper() in text:
            return county
    
    return "Unknown"

def extract_table_data(page):
    """Extract table data using multiple strategies"""
    try:
        # Strategy 1: Try to extract tables using pdfplumber's table detection
        tables = page.extract_tables({
            "vertical_strategy": "lines", 
            "horizontal_strategy": "lines",
            "snap_tolerance": 5,
        })
        
        if tables:
            rows = []
            for table in tables:
                for row in table:
                    # Clean each cell in the row
                    cleaned_row = [clean_text(cell) for cell in row if cell is not None]
                    # Only add rows that have meaningful data (not just headers)
                    if (len(cleaned_row) >= 3 and 
                        not any(header in ' '.join(cleaned_row).lower() 
                               for header in ['constituency', 'office location', 'landmark', 'county'])):
                        rows.append(cleaned_row)
            return rows
        
        # Strategy 2: Fall back to text extraction with layout preservation
        text = page.extract_text(layout=True, x_tolerance=2, y_tolerance=2)
        if not text:
            return []
        
        lines = [clean_text(line) for line in text.split('\n') if clean_text(line)]
        rows = []
        current_row = []
        
        for line in lines:
            # Skip header lines and page numbers
            if any(ignore in line.lower() for ignore in ['page', 'independent electoral', 'iebc', 'physical locations', 'kenya']):
                continue
            
            # Look for table-like data (multiple pieces of information separated by spaces)
            parts = re.split(r'\s{2,}', line)
            if len(parts) >= 3:
                # This looks like a table row
                rows.append(parts)
            elif len(parts) == 1 and current_row:
                # Might be continuation of previous row
                current_row[-1] += " " + parts[0]
            else:
                current_row = parts
        
        return rows
        
    except Exception as e:
        logger.error(f"Error extracting table data: {e}")
        return []

def process_extracted_data(rows, county):
    """Process extracted rows into structured data"""
    processed_rows = []
    
    for row in rows:
        if len(row) < 3:
            continue
            
        # Different patterns based on row length
        if len(row) >= 4:
            # Full row with all columns
            constituency_name = row[0]
            office_location = row[1]
            landmark = row[2]
            distance = row[3]
        elif len(row) == 3:
            # Row with 3 columns - assume pattern: name, location, landmark (distance might be missing or merged)
            constituency_name = row[0]
            office_location = row[1]
            landmark = row[2]
            distance = ""
            # Try to extract distance from landmark if it's there
            distance_match = re.search(r'(\d+\s*(?:meters|metres|m|km|kms|ft))', landmark, re.IGNORECASE)
            if distance_match:
                distance = distance_match.group(1)
        
        # Skip if it's clearly not a constituency row
        if any(header in constituency_name.lower() for header in ['constituency', 'office location', 'landmark']):
            continue
            
        # Create structured row
        processed_row = {
            "county": county,
            "constituency_code": "",  # Not available in this PDF
            "constituency_name": clean_text(constituency_name),
            "office_location": clean_text(office_location),
            "landmark": clean_text(landmark),
            "distance_from_landmark": clean_text(distance)
        }
        
        # Only add if we have meaningful data
        if processed_row["constituency_name"] and processed_row["office_location"]:
            processed_rows.append(processed_row)
    
    return processed_rows

def extract_table_from_page(page):
    """Extract table data from a single PDF page"""
    try:
        # Get page text for county detection
        page_text = page.extract_text() or ""
        county = extract_county_from_page(page_text)
        
        logger.info(f"Processing page for {county} county")
        
        # Extract table data
        raw_rows = extract_table_data(page)
        
        # Process the extracted data
        processed_rows = process_extracted_data(raw_rows, county)
        
        return processed_rows
        
    except Exception as e:
        logger.error(f"Error processing page: {e}")
        return []

def main():
    """Main extraction function"""
    logger.info("Starting IEBC PDF extraction...")
    
    if not PDF_PATH.exists():
        logger.error(f"PDF file not found: {PDF_PATH}")
        sys.exit(1)
    
    all_rows = []
    
    try:
        with pdfplumber.open(PDF_PATH) as pdf:
            total_pages = len(pdf.pages)
            logger.info(f"Processing {total_pages} pages...")
            
            for page_num, page in enumerate(pdf.pages, 1):
                logger.info(f"Processing page {page_num}/{total_pages}")
                page_rows = extract_table_from_page(page)
                all_rows.extend(page_rows)
                logger.info(f"Extracted {len(page_rows)} rows from page {page_num}")
        
        # Remove duplicates based on constituency name and county
        unique_rows = []
        seen = set()
        for row in all_rows:
            key = (row["county"], row["constituency_name"])
            if key not in seen:
                seen.add(key)
                unique_rows.append(row)
        
        # Write to CSV
        OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
        
        with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=COLUMN_HEADERS)
            writer.writeheader()
            for row in unique_rows:
                writer.writerow(row)
        
        logger.info(f"Successfully extracted {len(unique_rows)} unique rows to {OUTPUT_CSV}")
        
        # Print summary
        counties = set(row['county'] for row in unique_rows)
        logger.info(f"Counties processed: {len(counties)}")
        logger.info(f"Counties: {', '.join(sorted(counties))}")
        
    except Exception as e:
        logger.error(f"PDF processing failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()