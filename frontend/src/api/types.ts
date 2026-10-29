export type Market = "IN";

export interface UpcomingIpo {
  company_name: string;
  symbol: string | null;
  open_date: string | null;
  close_date: string | null;
  listing_date: string | null;
  price_band: string | null;
  lot_size: string | null;
  category: string;
  status: string;
}

export interface RecentIpo {
  company_name: string;
  symbol: string | null;
  listing_date: string | null;
  issue_price: number | null;
  listing_price: number | null;
  current_price: number | null;
  gain_pct: number | null;
  category: string;
}

export interface IpoResponse {
  upcoming: UpcomingIpo[];
  recent: RecentIpo[];
}

export interface NewsArticle {
  title: string;
  link: string;
  source: string | null;
  published_at: string | null;
}

export interface NewsResponse {
  market: Market;
  symbol: string;
  articles: NewsArticle[];
}

export interface RefreshStatusResponse {
  job_id: number;
  market: string | null;
  job_type: string;
  status: "running" | "success" | "partial" | "failed" | "skipped";
  started_at: string;
  finished_at: string | null;
  symbols_processed: number;
  symbols_failed: number;
  error_message: string | null;
}

export interface ApiErrorDetail {
  error?: string;
  nearest_available_date?: string | null;
}

export interface SearchResultItem {
  symbol: string;
  name: string | null;
  market: Market;
  sector: string | null;
  industry: string | null;
}

export interface SearchResponse {
  query: string;
  items: SearchResultItem[];
}

export interface StockLatestMetrics {
  trade_date: string;
  close: number | null;
  prev_close: number | null;
  pct_change: number | null;
  volume: number | null;
  rel_volume: number | null;
}

export interface FundamentalsData {
  market_cap: number | null;
  pe_ratio: number | null;
  forward_pe: number | null;
  dividend_yield: number | null;
  roe: number | null;
  book_value: number | null;
  debt_to_equity: number | null;
  fetched_at: string;
  fetch_status: "ok" | "partial" | "failed";
}

export interface StockDetailResponse {
  market: Market;
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  last_seen: string | null;
  latest: StockLatestMetrics | null;
  week52_high: number | null;
  week52_low: number | null;
  fundamentals: FundamentalsData | null;
}

export interface HistoryPoint {
  trade_date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export interface StockHistoryResponse {
  market: Market;
  symbol: string;
  points: HistoryPoint[];
}

export interface PeerItem {
  symbol: string;
  name: string | null;
  close: number | null;
  pct_change: number | null;
  market_cap: number | null;
  pe_ratio: number | null;
}

export interface StockPeersResponse {
  market: Market;
  symbol: string;
  sector: string | null;
  sector_median_pe: number | null;
  peers: PeerItem[];
}

export interface WatchlistItem {
  id: number;
  market: Market;
  symbol: string;
  name: string | null;
  added_at: string;
  close: number | null;
  pct_change: number | null;
}

export interface WatchlistResponse {
  items: WatchlistItem[];
}

export interface HoldingItem {
  id: number;
  market: Market;
  symbol: string;
  name: string | null;
  sector: string | null;
  quantity: number;
  buy_price: number;
  buy_date: string;
  sell_price: number | null;
  sell_date: string | null;
  is_closed: boolean;
  notes: string | null;
  current_price: number | null;
  market_value: number | null;
  pnl: number | null;
  pnl_pct: number | null;
}

export interface HoldingsResponse {
  items: HoldingItem[];
}

export interface MarketSummary {
  invested: number;
  market_value: number;
  pnl: number;
  pnl_pct: number | null;
  realized_pnl: number;
}

export interface AllocationSlice {
  label: string;
  value_inr: number;
  pct: number;
}

export interface HoldingsSummaryResponse {
  fx_rate_usd_inr: number | null;
  total_invested_inr: number | null;
  total_market_value_inr: number | null;
  total_pnl_inr: number | null;
  total_pnl_pct: number | null;
  total_market_value_usd: number | null;
  total_realized_pnl_inr: number | null;
  by_market: Record<string, MarketSummary>;
  allocation: AllocationSlice[];
}

export interface HoldingCreateRequest {
  market: Market;
  symbol: string;
  quantity: number;
  buy_price: number;
  buy_date: string;
  notes?: string;
}

export interface HoldingUpdateRequest {
  quantity?: number;
  buy_price?: number;
  buy_date?: string;
  notes?: string;
}

export interface MarketNewsArticle {
  title: string;
  link: string;
  source: string | null;
  published_at: string | null;
  symbol: string;
}

export interface MarketNewsResponse {
  market: Market;
  articles: MarketNewsArticle[];
}

export interface LiveQuoteResponse {
  market: Market;
  symbol: string;
  price: number | null;
  change_value: number | null;
  change_pct: number | null;
  is_market_open: boolean;
  as_of: string;
}

export interface QuarterlyPoint {
  quarter: string;
  period_end_date: string | null;
  revenue: number | null;
  revenue_qoq: number | null;
  revenue_yoy: number | null;
  gross_profit: number | null;
  gross_margin: number | null;
  operating_income: number | null;
  op_margin: number | null;
  ebitda: number | null;
  net_profit: number | null;
  net_margin: number | null;
  eps: number | null;
  free_cash_flow: number | null;
  total_debt: number | null;
  interest_coverage: number | null;
  price_reaction: number | null;
}

export interface ShareholdingData {
  promoters: number;
  institutions: number;
  public_other: number;
}

export interface QuarterlyResponse {
  market: Market;
  symbol: string;
  quarterly: QuarterlyPoint[];
  shareholding: ShareholdingData | null;
}

export interface AnnualPLPoint {
  year: string;
  revenue: number | null;
  expenses: number | null;
  operating_profit: number | null;
  op_margin: number | null;
  other_income: number | null;
  depreciation: number | null;
  interest: number | null;
  pbt: number | null;
  tax_pct: number | null;
  net_profit: number | null;
  net_margin: number | null;
  eps: number | null;
  dividend_per_share: number | null;
}

export interface AnnualBSPoint {
  year: string;
  equity_capital: number | null;
  reserves: number | null;
  total_debt: number | null;
  current_liabilities: number | null;
  total_liabilities: number | null;
  fixed_assets: number | null;
  current_assets: number | null;
  total_assets: number | null;
}

export interface AnnualCFPoint {
  year: string;
  operating_cf: number | null;
  investing_cf: number | null;
  financing_cf: number | null;
  free_cash_flow: number | null;
  capex: number | null;
}

export interface EfficiencyRatios {
  debtor_days: number | null;
  inventory_days: number | null;
  days_payable: number | null;
  cash_conversion_cycle: number | null;
  working_capital_days: number | null;
  roce: number | null;
}

export interface AnnualCAGR {
  revenue_3yr: number | null;
  revenue_5yr: number | null;
  profit_3yr: number | null;
  profit_5yr: number | null;
}

export interface SignalItem {
  type: "pro" | "con";
  text: string;
}

export interface AnnualResponse {
  market: Market;
  symbol: string;
  annual_pl: AnnualPLPoint[];
  annual_bs: AnnualBSPoint[];
  annual_cf: AnnualCFPoint[];
  efficiency: EfficiencyRatios | null;
  cagr: AnnualCAGR | null;
  signals: SignalItem[];
  face_value: number | null;
  website: string | null;
}

export type RankingType = "gainers" | "losers" | "volume" | "trending" | "streak";

export interface RankingItem {
  symbol: string;
  name: string | null;
  sector: string | null;
  close: number | null;
  pct_change: number | null;
  volume: number | null;
  rel_volume: number | null;
}

export interface RankingsResponse {
  market: Market;
  type: RankingType;
  days: number;
  items: RankingItem[];
}

export interface StreakDayPoint {
  date: string;
  pct_change: number;
}

export interface StreakItem {
  symbol: string;
  name: string | null;
  sector: string | null;
  close: number | null;
  pct_change_today: number | null;
  volume: number | null;
  days_count: number;
  avg_pct_change: number;
  history: StreakDayPoint[];
}

export interface StreakResponse {
  market: Market;
  days: number;
  top_n: number;
  dates: string[];
  items: StreakItem[];
}
