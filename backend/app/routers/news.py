from __future__ import annotations

from fastapi import APIRouter, Query

from app.schemas import MarketNewsArticle, MarketNewsResponse, NewsArticle, NewsResponse
from app.services.news_service import get_market_news, get_news

router = APIRouter(prefix="/api", tags=["news"])


@router.get("/news", response_model=NewsResponse)
def get_stock_news(
    market: str = Query(...),
    symbol: str = Query(...),
    name: str | None = Query(None),
) -> NewsResponse:
    articles = get_news(market, symbol, name)
    return NewsResponse(
        market=market,
        symbol=symbol,
        articles=[NewsArticle(**a) for a in articles],
    )


@router.get("/news/market", response_model=MarketNewsResponse)
def get_market_news_endpoint(
    market: str = Query(...),
    limit: int = Query(30, ge=1, le=100),
) -> MarketNewsResponse:
    articles = get_market_news(market, limit)
    return MarketNewsResponse(
        market=market,
        articles=[MarketNewsArticle(**a) for a in articles],
    )
