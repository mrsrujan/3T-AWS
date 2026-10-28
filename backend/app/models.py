from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Symbol(Base):
    __tablename__ = "symbols"
    __table_args__ = (
        UniqueConstraint("market", "symbol", name="uq_symbols_market_symbol"),
        CheckConstraint("market IN ('US','IN')", name="ck_symbols_market"),
    )

    symbol_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    market: Mapped[str] = mapped_column(String(2), nullable=False)
    symbol: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    is_active: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    first_seen: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_seen: Mapped[date | None] = mapped_column(Date, nullable=True)
    sector: Mapped[str | None] = mapped_column(String(128), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(128), nullable=True)

    daily_metrics: Mapped[list["DailyMetric"]] = relationship(back_populates="symbol_ref")


class DailyMetric(Base):
    __tablename__ = "daily_metrics"
    __table_args__ = (
        UniqueConstraint("symbol_id", "trade_date", name="uq_daily_metrics_symbol_date"),
        CheckConstraint("market IN ('US','IN')", name="ck_daily_metrics_market"),
        Index("idx_dm_date_market_pct", "trade_date", "market", "pct_change"),
        Index("idx_dm_date_market_vol", "trade_date", "market", "volume"),
        Index("idx_dm_date_market_relvol", "trade_date", "market", "rel_volume"),
        Index("idx_dm_symbol_date", "symbol_id", "trade_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol_id: Mapped[int] = mapped_column(ForeignKey("symbols.symbol_id"), nullable=False)
    market: Mapped[str] = mapped_column(String(2), nullable=False)
    trade_date: Mapped[date] = mapped_column(Date, nullable=False)

    open: Mapped[float | None] = mapped_column(Float, nullable=True)
    high: Mapped[float | None] = mapped_column(Float, nullable=True)
    low: Mapped[float | None] = mapped_column(Float, nullable=True)
    close: Mapped[float | None] = mapped_column(Float, nullable=True)
    prev_close: Mapped[float | None] = mapped_column(Float, nullable=True)
    volume: Mapped[int | None] = mapped_column(Integer, nullable=True)
    turnover: Mapped[float | None] = mapped_column(Float, nullable=True)

    pct_change: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_volume_20d: Mapped[float | None] = mapped_column(Float, nullable=True)
    rel_volume: Mapped[float | None] = mapped_column(Float, nullable=True)

    symbol_ref: Mapped["Symbol"] = relationship(back_populates="daily_metrics")


class TradingCalendar(Base):
    __tablename__ = "trading_calendar"

    market: Mapped[str] = mapped_column(String(2), primary_key=True)
    trade_date: Mapped[date] = mapped_column(Date, primary_key=True)


class RefreshLog(Base):
    __tablename__ = "refresh_log"
    __table_args__ = (
        CheckConstraint(
            "job_type IN ('scheduled','manual','backfill')", name="ck_refresh_log_job_type"
        ),
        CheckConstraint(
            "status IN ('running','success','partial','failed','skipped')",
            name="ck_refresh_log_status",
        ),
    )

    job_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    market: Mapped[str | None] = mapped_column(String(4), nullable=True)
    job_type: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    symbols_processed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    symbols_failed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(String(2048), nullable=True)


class Watchlist(Base):
    """Single-user watchlist - no auth/user_id concept, this is a personal
    self-hosted app."""

    __tablename__ = "watchlist"
    __table_args__ = (UniqueConstraint("symbol_id", name="uq_watchlist_symbol"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol_id: Mapped[int] = mapped_column(ForeignKey("symbols.symbol_id"), nullable=False)
    market: Mapped[str] = mapped_column(String(2), nullable=False)
    added_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class Holding(Base):
    """Single-user portfolio holdings. No uniqueness constraint - multiple
    lots of the same symbol are legitimate, separate rows. P&L is always
    computed live at read time against the latest daily_metrics close, never
    stored."""

    __tablename__ = "holdings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol_id: Mapped[int] = mapped_column(ForeignKey("symbols.symbol_id"), nullable=False)
    market: Mapped[str] = mapped_column(String(2), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    buy_price: Mapped[float] = mapped_column(Float, nullable=False)
    buy_date: Mapped[date] = mapped_column(Date, nullable=False)
    # Set when the position is closed - P&L becomes realized at sell_price.
    sell_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    sell_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


