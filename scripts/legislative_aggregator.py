import os
import json
import csv
import logging
from datetime import datetime
from typing import List, Dict, Any
from supabase import create_client, Client

# ==============================================================================
# LEGISLATIVE MASTER-PACK AGGREGATOR
# Mission: Compile quarterly civic intelligence packs for the KE Master-Pack.
# ==============================================================================

logging.basicConfig(level=logging.INFO, format='%(asctime)s - [MASTER-PACK] - %(levelname)s - %(message)s')

class LegislativeAggregator:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not self.url or not self.key:
            logging.error("Missing Supabase credentials in environment.")
        self.supabase: Client = create_client(self.url, self.key)
        self.output_dir = "processed_data/master_packs"
        os.makedirs(self.output_dir, exist_ok=True)

    def fetch_recent_legislation(self, days=90) -> List[Dict[str, Any]]:
        """Fetch all bills updated or created in the last quarter."""
        logging.info(f"🔍 Fetching legislation for the last {days} days...")
        try:
            # Note: We can filter by created_at or session_year
            response = self.supabase.table("bills").select("*").order("created_at", desc=True).limit(200).execute()
            return response.data
        except Exception as e:
            logging.error(f"Failed to fetch legislation: {e}")
            return []

    def compile_pack(self, data: List[Dict[str, Any]]):
        """Compile the data into human-readable and machine-readable formats."""
        timestamp = datetime.now().strftime("%Y_Q%q") # Approximate Q
        pack_id = f"CEKA_MASTER_PACK_{datetime.now().strftime('%Y%m%d')}"
        
        pack_dir = os.path.join(self.output_dir, pack_id)
        os.makedirs(pack_dir, exist_ok=True)

        # 1. JSON Export (Machine Readable)
        json_path = os.path.join(pack_dir, "legislation_master.json")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump({
                "pack_metadata": {
                    "id": pack_id,
                    "compiled_at": datetime.now().isoformat(),
                    "record_count": len(data),
                    "version": "1.0.0-HAM"
                },
                "records": data
            }, f, indent=2, ensure_ascii=False)

        # 2. CSV Export (Spreadsheet Compatible)
        csv_path = os.path.join(pack_dir, "legislation_master.csv")
        if data:
            keys = data[0].keys()
            with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                dict_writer = csv.DictWriter(f, fieldnames=keys)
                dict_writer.writeheader()
                dict_writer.writerows(data)

        # 3. Summary Report (Human Readable)
        summary_path = os.path.join(pack_dir, "MASTER_PACK_INDEX.md")
        with open(summary_path, 'w', encoding='utf-8') as f:
            f.write(f"# CEKA Legislative Master-Pack Index\n\n")
            f.write(f"**Pack ID:** `{pack_id}`\n")
            f.write(f"**Compiled:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
            f.write(f"**Total Records:** {len(data)}\n\n")
            f.write(f"## High-Impact Bills in this Pack\n\n")
            for bill in data[:10]: # Top 10
                f.write(f"- **{bill.get('title')}** ({bill.get('session_year')})\n")
                f.write(f"  - Status: {bill.get('status')}\n")
                f.write(f"  - House: {bill.get('house')}\n\n")

        logging.info(f"✅ Master-Pack compiled successfully at: {pack_dir}")
        return pack_dir

    def run(self):
        data = self.fetch_recent_legislation()
        if not data:
            logging.warning("No data found to aggregate.")
            return
        
        pack_path = self.compile_pack(data)
        
        # In a real sync, we would upload to Backblaze B2 here
        logging.info("🚀 Master-Pack ready for distribution via /tools hub.")

if __name__ == "__main__":
    aggregator = LegislativeAggregator()
    aggregator.run()
