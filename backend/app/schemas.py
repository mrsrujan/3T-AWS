from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel

Market = str  # "IN"


class UpcomingIpo(BaseModel):
    company_name: str
    symbol: str | None = None
    open_date: str | None = None
    close_date: str | None = None
    listing_date: str | None = None
    price_band: str | None = None
    lot_size: str | None = None
    category: str = "Main Board"
    status: str = "Upcoming"


class RecentIpo(BaseModel):
    company_name: str
    symbol: str | None = None
    listing_date: str | None = None
    issue_price: float | None = None
    listing_price: float | None = None
    current_price: float | None = None
    gain_pct: float | None = None
    category: str = "Main Board"


class IpoResponse(BaseModel):
    upcoming: list[UpcomingIpo]
    recent: list[RecentIpo]


class NewsArticle(BaseModel):
    title: str
    link: str
    source: str | None = None
    published_at: str | None = None


class NewsResponse(BaseModel):
    market: Market
    symbol: str
    articles: list[NewsArticle]


class MarketNewsArticle(BaseModel):
    title: str
    link: str
    source: str | None = None
    published_at: str | None = None
    symbol: str


class MarketNewsResponse(BaseModel):
    market: Market
    articles: list[MarketNewsArticle]


class SearchResultItem(BaseModel):
    symbol: str
    name: str | None = None
    market: Market
    sector: str | None = None
    industry: str | None = None


class SearchResponse(BaseModel):
    query: str
    items: list[SearchResultItem]


class StockLatestMetrics(BaseModel):
    trade_date: date
    close: float | None = None
    prev_close: float | None = None
    pct_change: float | None = None
    volume: int | None = None
    rel_volume: float | None = None


class FundamentalsData(BaseModel):
    market_cap: float | None = None
    pe_ratio: float | None = None
    forward_pe: float | None = None
    dividend_yield: float | None = None
    roe: float | None = None
    book_value: float | None = None
    debt_to_equity: float | None = None
    fetched_at: datetime
    fetch_status: str


class StockDetailResponse(BaseModel):
    market: Market
    symbol: str
    name: str | None = None
    sector: str | None = None
    industry: str | None = None
    last_seen: date | None = None
    latest: StockLatestMetrics | None = None
    week52_high: float | None = None
    week52_low: float | None = None
    fundamentals: FundamentalsData | None = None


class HistoryPoint(BaseModel):
    trade_date: date
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float | None = None
    volume: int | None = None


class StockHistoryResponse(BaseModel):
    market: Market
    symbol: str
    points: list[HistoryPoint]


class PeerItem(BaseModel):
    symbol: str
    name: str | None = None
    close: float | None = None
    pct_change: float | None = None
    market_cap: float | None = None
    pe_ratio: float | None = None


class StockPeersResponse(BaseModel):
    market: Market
    symbol: str
    sector: str | None = None
    sector_median_pe: float | None = None
    peers: list[PeerItem]


class WatchlistItem(BaseModel):
    id: int
    market: Market
    symbol: str
    name: str | None = None
    added_at: datetime
    close: float | None = None
    pct_change: float | None = None


class WatchlistResponse(BaseModel):
    items: list[WatchlistItem]


class WatchlistAddRequest(BaseModel):
    market: Market
    symbol: str


class HoldingItem(BaseModel):
    id: int
    market: Market
    symbol: str
    name: str | None = None
    sector: str | None = None
    quantity: float
    buy_price: float
    buy_date: date
    sell_price: float | None = None
    sell_date: date | None = None
    is_closed: bool = False
    notes: str | None = None
    current_price: float | None = None
    market_value: float | None = None
    pnl: float | None = None
    pnl_pct: float | None = None


class HoldingsResponse(BaseModel):
    items: list[HoldingItem]


class MarketSummary(BaseModel):
    invested: float
    market_value: float
    pnl: float
    pnl_pct: float | None = None
    realized_pnl: float = 0.0


class AllocationSlice(BaseModel):
    label: str
    value_inr: float
    pct: float


class HoldingsSummaryResponse(BaseModel):
    fx_rate_usd_inr: float | None = None
    total_invested_inr: float | None = None
    total_market_value_inr: float | None = None
    total_pnl_inr: float | None = None
    total_pnl_pct: float | None = None
    total_market_value_usd: float | None = None
    total_realized_pnl_inr: float | None = None
    by_market: dict[str, MarketSummary]
    allocation: list[AllocationSlice] = []


class SellHoldingRequest(BaseModel):
    sell_price: float
    sell_date: date


class HoldingCreateRequest(BaseModel):
    market: Market
    symbol: str
    quantity: float
    buy_price: float
    buy_date: date
    notes: str | None = None


class HoldingUpdateRequest(BaseModel):
    quantity: float | None = None
    buy_price: float | None = None
    buy_date: date | None = None
    notes: str | None = None


class RefreshRequest(BaseModel):
    market: Market = "IN"
    refresh_date: date | None = None


class RefreshStatusResponse(BaseModel):
    job_id: int
    market: str | None
    job_type: str
    status: str
    started_at: str
    finished_at: str | None
    symbols_processed: int
    symbols_failed: int
    error_message: str | None


class LiveQuoteResponse(BaseModel):
    market: Market
    symbol: str
    price: float | None = None
    change_value: float | None = None
    change_pct: float | None = None
    is_market_open: bool
    as_of: str


class IntradayPoint(BaseModel):
    time: int  # epoch seconds UTC
    price: float
    volume: int | None = None


class IntradayResponse(BaseModel):
    market: Market
    symbol: str
    points: list[IntradayPoint]


class QuarterlyPoint(BaseModel):
    quarter: str
    period_end_date: str | None = None
    revenue: float | None = None
    revenue_qoq: float | None = None
    revenue_yoy: float | None = None
    gross_profit: float | None = None
    gross_margin: float | None = None
    operating_income: float | None = None
    op_margin: float | None = None
    ebitda: float | None = None
    net_profit: float | None = None
    net_margin: float | None = None
    eps: float | None = None
    free_cash_flow: float | None = None
    total_debt: float | None = None
    interest_coverage: float | None = None
    price_reaction: float | None = None


class ShareholdingData(BaseModel):
    promoters: float
    institutions: float
    public_other: float


class QuarterlyResponse(BaseModel):
    market: Market
    symbol: str
    quarterly: list[QuarterlyPoint]
    shareholding: ShareholdingData | None = None


class AnnualPLPoint(BaseModel):
    year: str
    revenue: float | None = None
    expenses: float | None = None
    operating_profit: float | None = None
    op_margin: float | None = None
    other_income: float | None = None
    depreciation: float | None = None
    interest: float | None = None
    pbt: float | None = None
    tax_pct: float | None = None
    net_profit: float | None = None
    net_margin: float | None = None
    eps: float | None = None
    dividend_per_share: float | None = None


class AnnualBSPoint(BaseModel):
    year: str
    equity_capital: float | None = None
    reserves: float | None = None
    total_debt: float | None = None
    current_liabilities: float | None = None
    total_liabilities: float | None = None
    fixed_assets: float | None = None
    current_assets: float | None = None
    total_assets: float | None = None


class AnnualCFPoint(BaseModel):
    year: str
    operating_cf: float | None = None
    investing_cf: float | None = None
    financing_cf: float | None = None
    free_cash_flow: float | None = None
    capex: float | None = None


class EfficiencyRatios(BaseModel):
    debtor_days: float | None = None
    inventory_days: float | None = None
    days_payable: float | None = None
    cash_conversion_cycle: float | None = None
    working_capital_days: float | None = None
    roce: float | None = None


class AnnualCAGR(BaseModel):
    revenue_3yr: float | None = None
    revenue_5yr: float | None = None
    profit_3yr: float | None = None
    profit_5yr: float | None = None


class SignalItem(BaseModel):
    type: str  # "pro" | "con"
    text: str


class AnnualResponse(BaseModel):
    market: Market
    symbol: str
    annual_pl: list[AnnualPLPoint]
    annual_bs: list[AnnualBSPoint]
    annual_cf: list[AnnualCFPoint]
    efficiency: EfficiencyRatios | None = None
    cagr: AnnualCAGR | None = None
    signals: list[SignalItem]
    face_value: float | None = None
    website: str | None = None
