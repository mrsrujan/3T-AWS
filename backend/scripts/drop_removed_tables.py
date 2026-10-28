"""Drop tables that were removed in the tickertape rebuild.
Run once against the live DB:
  python scripts/drop_removed_tables.py
Idempotent - IF EXISTS guards mean re-running is safe.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db import engine
from sqlalchemy import text

TABLES = ["alert_triggers", "alert_rules", "forecast_models", "news_sentiment_snapshots", "news_cache", "macro_series"]

with engine.connect() as conn:
    for table in TABLES:
        conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
        print(f"Dropped (if existed): {table}")
    conn.commit()

print("Done.")
