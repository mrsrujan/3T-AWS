from pathlib import Path

from pydantic_settings import BaseSettings

BACKEND_DIR = Path(__file__).resolve().parent.parent
_DEFAULT_SQLITE_PATH = BACKEND_DIR / "stocks.db"


class Settings(BaseSettings):
    # Full SQLAlchemy URL. Env override: STOCKS_DATABASE_URL.
    # Local dev default stays SQLite; K8s sets postgresql+psycopg://...
    database_url: str = f"sqlite:///{_DEFAULT_SQLITE_PATH}"
    default_top_n: int = 25
    # 10 calendar days ≈ 5-7 trading days (one business week, with slack for
    # a holiday). Enough for daily rankings, watchlist, and portfolio P&L.
    # Chart-heavy / analytics features (20-day rel_volume, 52W high/low,
    # 200-day MA, forecast training, scanner setups) will show null/empty
    # at this window — explicit trade-off for a lean DB footprint.
    backfill_calendar_days: int = 10
    rolling_window_days: int = 20
    # Wildcard because clients arrive from several origins with no way to
    # enumerate them: the dev server, the dockerized frontend on the LAN IP,
    # and the Capacitor Android WebView (origin https://localhost). The API
    # is cookie-less and unauthenticated on a private LAN, so this doesn't
    # weaken anything credentials-based.
    cors_origins: list[str] = ["*"]

    # Enable in-process APScheduler. True for local dev; set False in K8s
    # API pods so only the dedicated CronJobs run scheduled work.
    scheduler_enabled: bool = True

    class Config:
        env_prefix = "STOCKS_"


settings = Settings()
