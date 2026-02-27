import pandas as pd
import os

CSV_PATH = 'd:/CEKA/RECALL254/scripts/data/geocoded_iebc_offices.csv'

if os.path.exists(CSV_PATH):
    try:
        # File is large, load carefully
        df = pd.read_csv(CSV_PATH, low_memory=False)
        print(f"Total rows: {len(df)}")
        print(f"Unique Constituencies: {df['constituency_name'].nunique()}")
        print(f"Unique Counties: {df['county'].nunique()}")
        
        # Check success rate
        if 'geocode_status' in df.columns:
            print("\nGeocode Status Counts:")
            print(df['geocode_status'].value_counts())
            
        # Top 10 constituencies by count (to see redundancy)
        print("\nTop redundant constituencies:")
        print(df['constituency_name'].value_counts().head(10))
        
        # Deduplicate to see if we have 290
        # Group by constituency and pick the most 'confident' successful geocode if available
        if 'geocode_confidence' in df.columns and 'geocode_status' in df.columns:
            df['confidence_score'] = pd.to_numeric(df['geocode_confidence'], errors='coerce')
            success_df = df[df['geocode_status'] == 'success'].sort_values('confidence_score', ascending=False)
            best_results = success_df.drop_duplicates(subset=['constituency_name'])
            print(f"\nSuccessful unique constituencies: {len(best_results)}")
            
            if len(best_results) >= 290:
                print("GOLDMINE FOUND! Full dataset is geocoded and available here.")
            else:
                print(f"Gap remains: {290 - len(best_results)} constituencies missing successful geocoding.")
                
    except Exception as e:
        print(f"Error: {e}")
else:
    print("CSV NOT FOUND")
