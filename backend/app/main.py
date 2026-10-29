import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.config import settings
from app.db import Base, SessionLocal, engine
from app.models import TradingCalendar
from app.routers import (
    holdings,
    ipo,
    news,
    rankings,
    refresh,
    search,
    stock,
    watchlist,
)
from app.services.backfill import backfill_market
from app.services.refresh_orchestrator import (
    RefreshAlreadyRunningError,
    needs_catchup,
    refresh_market,
    sweep_interrupted_jobs,
)
from app.services.scheduler import scheduler, start_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

logger = logging.getLogger(__name__)


def _has_any_trading_days(market: str) -> bool:
    db = SessionLocal()
    try:
        return db.query(TradingCalendar).filter(TradingCalendar.market == market).first() is not None
    finally:
        db.close()


async def _backfill_if_empty(market: str) -> None:
    if _has_any_trading_days(market):
        return

    def _run() -> None:
        db = SessionLocal()
        try:
            summary = backfill_market(db, market)
            logger.info("Startup backfill for %s: %s", market, summary)
        finally:
            db.close()

    await asyncio.to_thread(_run)


async def _catchup_if_stale(market: str) -> None:
    def _run() -> None:
        db = SessionLocal()
        try:
            if not needs_catchup(db, market):
                return
            logger.info("Catch-up refresh for %s: stored data is behind the last session", market)
            try:
                summary = refresh_market(db, market, job_type="scheduled")
                logger.info("Catch-up refresh for %s: %s", market, summary)
            except RefreshAlreadyRunningError:
                logger.info("Catch-up refresh for %s skipped - already running", market)
        finally:
            db.close()

    await asyncio.to_thread(_run)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    if settings.scheduler_enabled:
        db = SessionLocal()
        try:
            swept = sweep_interrupted_jobs(db)
            if swept:
                logger.warning("Marked %d refresh job(s) interrupted by the last shutdown as failed", swept)
        finally:
            db.close()
        asyncio.create_task(_backfill_if_empty("IN"))
        asyncio.create_task(_catchup_if_stale("IN"))
        start_scheduler()
    yield
    if settings.scheduler_enabled:
        scheduler.shutdown(wait=False)


app = FastAPI(title="Stocks Tracker API", lifespan=lifespan)

app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ipo.router)
app.include_router(news.router)
app.include_router(rankings.router)
app.include_router(refresh.router)
app.include_router(search.router)
app.include_router(stock.router)
app.include_router(watchlist.router)
app.include_router(holdings.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
