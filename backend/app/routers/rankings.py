from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.deps import get_db

router = APIRouter(prefix="/api", tags=["rankings"])

VALID_TYPES = {"gainers", "losers", "volume", "trending"}


@router.get("/rankings")
def get_rankings(
    market: str = Query("IN"),
    type: str = Query("gainers"),
    days: int = Query(1, ge=1, le=365),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    if type not in VALID_TYPES:
        return {"market": market, "type": type, "days": days, "items": []}

    # Always fetch the latest trade date first
    latest_date = db.execute(
        text("SELECT MAX(trade_date) FROM daily_metrics WHERE market = :m"),
        {"m": market},
    ).scalar()

    if not latest_date:
        return {"market": market, "type": type, "days": days, "items": []}

    if days == 1:
        rows = _single_day(db, market, latest_date, type, limit)
    else:
        rows = _multi_day(db, market, latest_date, days, type, limit)

    return {"market": market, "type": type, "days": days, "items": rows}


def _single_day(db: Session, market: str, latest_date: str, type: str, limit: int) -> list[dict]:
    if type == "gainers":
        order = "dm.pct_change DESC"
        where = "AND dm.pct_change IS NOT NULL AND dm.pct_change > 0"
    elif type == "losers":
        order = "dm.pct_change ASC"
        where = "AND dm.pct_change IS NOT NULL AND dm.pct_change < 0"
    elif type == "volume":
        order = "dm.volume DESC"
        where = "AND dm.volume IS NOT NULL AND dm.volume > 0"
    else:  # trending
        order = "dm.rel_volume DESC"
        where = "AND dm.rel_volume IS NOT NULL AND dm.rel_volume > 1"

    rows = db.execute(
        text(f"""
            SELECT s.symbol, s.name, s.sector,
                   dm.close, dm.pct_change, dm.volume, dm.rel_volume
            FROM daily_metrics dm
            JOIN symbols s ON s.symbol_id = dm.symbol_id
            WHERE dm.market = :market
              AND dm.trade_date = :dt
              AND dm.close IS NOT NULL
              AND s.is_active = 1
              {where}
            ORDER BY {order}
            LIMIT :limit
        """),
        {"market": market, "dt": latest_date, "limit": limit},
    ).all()

    return [_row_to_dict(r) for r in rows]


def _multi_day(db: Session, market: str, latest_date: str, days: int, type: str, limit: int) -> list[dict]:
    # Find the trade_date that is `days` trading sessions back
    start_date = db.execute(
        text("""
            SELECT trade_date FROM daily_metrics
            WHERE market = :market
              AND trade_date < :latest
            GROUP BY trade_date
            ORDER BY trade_date DESC
            LIMIT 1 OFFSET :offset
        """),
        {"market": market, "latest": latest_date, "offset": days - 1},
    ).scalar()

    if not start_date:
        # Not enough history — fall back to single day
        return _single_day(db, market, latest_date, type, limit)

    if type == "volume":
        # Average daily volume over period
        order = "avg_vol DESC"
        extra_col = ", AVG(dm_range.volume) AS avg_vol"
        extra_join = """
            JOIN (
                SELECT symbol_id, AVG(volume) AS volume, AVG(rel_volume) AS rel_volume
                FROM daily_metrics
                WHERE market = :market AND trade_date BETWEEN :start AND :latest AND volume IS NOT NULL
                GROUP BY symbol_id
            ) dm_range ON dm_range.symbol_id = dm_latest.symbol_id
        """
        vol_expr = "dm_range.volume"
        rel_vol_expr = "dm_range.rel_volume"
    else:
        extra_col = ""
        extra_join = """
            JOIN daily_metrics dm_start
              ON dm_start.symbol_id = dm_latest.symbol_id
             AND dm_start.market = :market
             AND dm_start.trade_date = :start
             AND dm_start.close IS NOT NULL AND dm_start.close > 0
        """
        vol_expr = "dm_latest.volume"
        rel_vol_expr = "dm_latest.rel_volume"

    if type == "gainers":
        order = "period_pct DESC"
        pct_filter = "AND (dm_latest.close / dm_start.close - 1) > 0"
    elif type == "losers":
        order = "period_pct ASC"
        pct_filter = "AND (dm_latest.close / dm_start.close - 1) < 0"
    else:  # trending / volume
        order = "period_pct DESC"
        pct_filter = ""

    if type == "volume":
        rows = db.execute(
            text(f"""
                SELECT s.symbol, s.name, s.sector,
                       dm_latest.close,
                       dm_latest.pct_change,
                       CAST({vol_expr} AS FLOAT) AS volume,
                       CAST({rel_vol_expr} AS FLOAT) AS rel_volume
                       {extra_col}
                FROM daily_metrics dm_latest
                JOIN symbols s ON s.symbol_id = dm_latest.symbol_id
                {extra_join}
                WHERE dm_latest.market = :market
                  AND dm_latest.trade_date = :latest
                  AND dm_latest.close IS NOT NULL
                  AND s.is_active = 1
                ORDER BY {order}
                LIMIT :limit
            """),
            {"market": market, "latest": latest_date, "start": start_date, "limit": limit},
        ).all()
    else:
        rows = db.execute(
            text(f"""
                SELECT s.symbol, s.name, s.sector,
                       dm_latest.close,
                       CAST((dm_latest.close / dm_start.close - 1) * 100 AS FLOAT) AS period_pct,
                       dm_latest.pct_change,
                       dm_latest.volume,
                       dm_latest.rel_volume
                FROM daily_metrics dm_latest
                JOIN symbols s ON s.symbol_id = dm_latest.symbol_id
                {extra_join}
                WHERE dm_latest.market = :market
                  AND dm_latest.trade_date = :latest
                  AND dm_latest.close IS NOT NULL
                  AND s.is_active = 1
                  {pct_filter}
                ORDER BY {order}
                LIMIT :limit
            """),
            {"market": market, "latest": latest_date, "start": start_date, "limit": limit},
        ).all()

    result = []
    for r in rows:
        d = dict(r._mapping)
        item = {
            "symbol": d["symbol"],
            "name": d.get("name"),
            "sector": d.get("sector"),
            "close": d.get("close"),
            "pct_change": d.get("period_pct") if type != "volume" else d.get("pct_change"),
            "volume": d.get("volume"),
            "rel_volume": d.get("rel_volume"),
        }
        result.append(item)
    return result


def _row_to_dict(r) -> dict:
    return {
        "symbol": r.symbol,
        "name": r.name,
        "sector": r.sector,
        "close": r.close,
        "pct_change": r.pct_change,
        "volume": r.volume,
        "rel_volume": r.rel_volume,
    }


@router.get("/rankings/streak")
def get_streak(
    market: str = Query("IN"),
    days: int = Query(3, ge=2, le=20),
    top_n: int = Query(50, ge=10, le=200),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    """
    Returns stocks that appeared in the top `top_n` gainers on ALL of the
    last `days` trading sessions — i.e. a consistent-gainer streak.
    Each item includes per-day pct_change history and days_count.
    """
    # Fetch the last `days` distinct trading dates (most recent first)
    date_rows = db.execute(
        text("""
            SELECT DISTINCT trade_date FROM daily_metrics
            WHERE market = :market
            ORDER BY trade_date DESC
            LIMIT :days
        """),
        {"market": market, "days": days},
    ).scalars().all()

    if len(date_rows) < days:
        return {"market": market, "days": days, "top_n": top_n, "dates": [], "items": []}

    dates = sorted(date_rows)          # ascending: oldest first
    latest_date = dates[-1]
    dates_tuple = ", ".join(f"'{d}'" for d in dates)

    # For each date, find which symbol_ids are in the top_n gainers.
    # Correlated-subquery rank: a row is top_n if fewer than top_n rows
    # on the same date have a strictly higher pct_change.
    rows = db.execute(
        text(f"""
            SELECT
                dm.symbol_id,
                dm.trade_date,
                dm.pct_change
            FROM daily_metrics dm
            WHERE dm.market = :market
              AND dm.trade_date IN ({dates_tuple})
              AND dm.pct_change > 0
              AND (
                  SELECT COUNT(*) FROM daily_metrics dm2
                  WHERE dm2.market = :market
                    AND dm2.trade_date = dm.trade_date
                    AND dm2.pct_change > dm.pct_change
              ) < :top_n
        """),
        {"market": market, "top_n": top_n},
    ).all()

    # Group by symbol: collect which dates each appeared on
    from collections import defaultdict
    appearances: dict[int, list] = defaultdict(list)
    for r in rows:
        appearances[r.symbol_id].append((r.trade_date, r.pct_change))

    # Keep only symbols that appeared on ALL requested dates
    required_dates = set(dates)
    qualifying = {
        sid: day_list
        for sid, day_list in appearances.items()
        if required_dates.issubset({d for d, _ in day_list})
    }

    if not qualifying:
        return {"market": market, "days": days, "top_n": top_n, "dates": list(dates), "items": []}

    # Fetch latest price + metadata for qualifying symbols
    sid_list = ", ".join(str(s) for s in qualifying)
    meta_rows = db.execute(
        text(f"""
            SELECT s.symbol_id, s.symbol, s.name, s.sector,
                   dm.close, dm.pct_change, dm.volume
            FROM symbols s
            JOIN daily_metrics dm
              ON dm.symbol_id = s.symbol_id
             AND dm.market = :market
             AND dm.trade_date = :latest
            WHERE s.symbol_id IN ({sid_list})
              AND s.is_active = 1
        """),
        {"market": market, "latest": latest_date},
    ).all()

    items = []
    for r in meta_rows:
        day_list = qualifying[r.symbol_id]
        # Build per-day history sorted oldest→newest
        history = sorted(
            [{"date": d, "pct_change": round(p, 4)} for d, p in day_list],
            key=lambda x: x["date"],
        )
        avg_pct = sum(p for _, p in day_list) / len(day_list)
        items.append({
            "symbol": r.symbol,
            "name": r.name,
            "sector": r.sector,
            "close": r.close,
            "pct_change_today": r.pct_change,
            "volume": r.volume,
            "days_count": len(day_list),
            "avg_pct_change": round(avg_pct, 4),
            "history": history,
        })

    # Sort: most days → highest avg gain
    items.sort(key=lambda x: (-x["days_count"], -x["avg_pct_change"]))
    return {
        "market": market,
        "days": days,
        "top_n": top_n,
        "dates": list(dates),
        "items": items[:limit],
    }
