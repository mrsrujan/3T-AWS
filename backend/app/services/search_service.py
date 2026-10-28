"""Symbol search for the NSE universe.

~2,500 total symbols - a plain LIKE scan is effectively instant, no FTS
indexing is justified at this scale.
"""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session

VALID_MARKETS = {"IN"}


def search_symbols(db: Session, query: str, market: str | None, limit: int) -> list[dict]:
    query = query.strip()
    if not query:
        return []

    market_clause = ""
    q_lower = query.lower()
    params: dict = {
        "exact": query.upper(),
        "prefix": f"{q_lower}%",
        "substr": f"%{q_lower}%",
        "limit": limit,
    }
    if market and market != "ALL":
        market_clause = "AND market = :market"
        params["market"] = market

    rows = db.execute(
        text(
            f"""
            SELECT symbol, name, market, sector, industry
            FROM symbols
            WHERE is_active = 1
              AND (LOWER(symbol) LIKE :substr OR LOWER(name) LIKE :substr)
              {market_clause}
            ORDER BY
                (symbol = :exact) DESC,
                (LOWER(symbol) LIKE :prefix) DESC,
                symbol ASC
            LIMIT :limit
            """
        ),
        params,
    ).all()

    return [
        {"symbol": r.symbol, "name": r.name, "market": r.market, "sector": r.sector, "industry": r.industry}
        for r in rows
    ]
