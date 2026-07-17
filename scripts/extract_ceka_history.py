import sqlite3
import os
import json
from pathlib import Path

db_path = r'D:\ceka_sessions.db'
out_path = r'd:\CEKA\ceka v010\CEKA\FULL_FORUM_HISTORY.md'

if not os.path.exists(db_path):
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('# CEKA Forum History\n\nDatabase D:\\ceka_sessions.db not found.')
    print('DB not found')
    exit()

con = sqlite3.connect(db_path)
con.row_factory = sqlite3.Row
cur = con.cursor()

with open(out_path, 'w', encoding='utf-8') as f:
    f.write('# CEKA FORUM FULL HISTORY DUMP\n\n')
    f.write('> **Source:** D:\\ceka_sessions.db\n')
    
    # 1. REC_SESSIONS
    f.write('\n---\n# 1. FULL RECORDED SESSIONS\n\n')
    for row in cur.execute('SELECT * FROM rec_sessions'):
        f.write(f"## Session: {row['title']} (Mode: {row['mode']})\n")
        f.write(f"- Created At: {row['created_at']}\n")
        f.write(f"- Duration: {row['duration_seconds']}s\n")
        f.write(f"- Audio Path: {row['audio_path']}\n\n")
        f.write("**Transcript:**\n")
        f.write(f"{row['transcript_text']}\n\n")
        f.write("**Summary:**\n")
        f.write(f"{row['summary_text']}\n\n")

    # 2. TRANSCRIPTS
    f.write('\n---\n# 2. LIVE CHUNK TRANSCRIPTS\n\n')
    for row in cur.execute('SELECT * FROM transcripts ORDER BY ts ASC'):
        f.write(f"**[{row['ts']}]** `[{row['track']}]` | Session: {row['session']}\n")
        f.write(f"> {row['text']}\n\n")

    # 3. ANALYSES
    f.write('\n---\n# 3. AI ANALYSES & INSIGHTS\n\n')
    for row in cur.execute('SELECT * FROM analyses ORDER BY ts ASC'):
        f.write(f"**[{row['ts']}]** `[{row['track']}]` | Session: {row['session']}\n")
        f.write(f"- **Heard:** {row['heard']}\n")
        f.write(f"- **Insight:** {row['insight']}\n")
        f.write(f"- **Action:** {row['action']}\n")
        f.write(f"- **Watch:** {row['watch']}\n")
        f.write(f"- **Full Raw Output:**\n```\n{row['full_raw']}\n```\n\n")

    # 4. QUESTIONS
    f.write('\n---\n# 4. GENERATED QUESTIONS\n\n')
    for row in cur.execute('SELECT * FROM questions ORDER BY ts ASC'):
        f.write(f"**[{row['ts']}]** `[{row['tag']}]` | Session: {row['session']}\n")
        f.write(f"> {row['text']}\n\n")

    # 5. DOCUMENTS (CONTEXT)
    f.write('\n---\n# 5. INGESTED CONTEXT DOCUMENTS\n\n')
    for row in cur.execute('SELECT * FROM documents'):
        f.write(f"## Document: {row['filename']}\n")
        f.write(f"- Filetype: {row['filetype']}\n")
        f.write(f"- Ingested At: {row['ingested_at']}\n")
        f.write(f"- Stored Path: {row['stored_path']}\n\n")
        # Output the first 500 chars of full_text as a snippet, the user asked for EVERYTHING but full_text of all PDFs might be gigabytes. 
        # I'll output full_text if they want it, but the instruction is "FULL! PROCEED! show me now!!!!!" Let's output it fully.
        f.write("**Full Text / Content:**\n")
        text = str(row['full_text'])
        f.write(f"{text}\n\n")

con.close()

# Also dump from file system locations
data_dir = Path.home() / "CEKA_LocalCapture"
if data_dir.exists():
    with open(out_path, 'a', encoding='utf-8') as f:
        f.write('\n---\n# 6. EXTERNAL FILE SYSTEM CAPTURES (C:\\Users\\Administrator\\CEKA_LocalCapture)\n\n')
        for sub in ['audio', 'transcripts', 'summaries', 'ingested_files']:
            p = data_dir / sub
            if p.exists():
                f.write(f"### /{sub}/\n")
                for item in p.glob('*'):
                    f.write(f"- {item.name}\n")
                    if sub in ['transcripts', 'summaries'] and item.is_file():
                        try:
                            content = item.read_text(encoding='utf-8')
                            f.write(f"  \n  **Content:**\n  ```\n  {content}\n  ```\n")
                        except Exception as e:
                            f.write(f"  *(Could not read text: {e})*\n")
                f.write('\n')

print('Dump complete')
