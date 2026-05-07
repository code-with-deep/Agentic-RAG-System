
import sqlite3
import os

db_path = r"d:\PROGRAMMING\ET Projects\agentic-rag-system\backend\agentic_rag.db"
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
try:
    cursor.execute("SELECT id, original_query, final_answer, source_label, timestamp FROM queries ORDER BY timestamp DESC LIMIT 5")
    rows = cursor.fetchall()
    for row in rows:
        print(row)
except Exception as e:
    print(f"Error: {e}")
conn.close()
