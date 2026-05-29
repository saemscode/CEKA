import psycopg2
import json

# DB connection using the pooled URL from .env
db_url = "postgresql://postgres.cajrvemigxghnfmyopiy:1268Saem%27sTunes%21@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

def repair_db():
    try:
        print(f"Connecting to database...")
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        bill_id = "5f07300d-b69c-4cf8-88d2-28ac1c6a1f6e"
        print(f"Repairing Bill: {bill_id}")
        
        stages = {
            "pre_publication": {"status": "completed", "completed_at": "2026-04-08"},
            "publication": {"status": "completed", "completed_at": "2026-05-05"},
            "first_reading": {"status": "active"},
            "second_reading": {"status": "pending"},
            "committee": {"status": "pending"},
            "report": {"status": "pending"},
            "third_reading": {"status": "pending"},
            "mediation": {"status": "pending"},
            "assent": {"status": "pending"}
        }
        
        sql = """
            UPDATE bills 
            SET status = %s, 
                stages = %s::jsonb, 
                title = %s, 
                description = %s 
            WHERE id = %s
        """
        
        cur.execute(sql, (
            "FIRST_READING", 
            json.dumps(stages), 
            "The Finance Bill, 2026", 
            "The Finance Bill, 2026", 
            bill_id
        ))
        
        conn.commit()
        print(f"Update successful. Rows affected: {cur.rowcount}")
        
        # Verify
        cur.execute("SELECT status FROM bills WHERE id = %s", (bill_id,))
        new_status = cur.fetchone()
        print(f"Verification - New Status: {new_status}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    repair_db()
