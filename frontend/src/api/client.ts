import type {
  Market,
  NewsResponse,
  RefreshStatusResponse,
  SearchResponse,
  StockDetailResponse,
  StockHistoryResponse,
  StockPeersResponse,
  WatchlistResponse,
  WatchlistItem,
  HoldingsResponse,
  HoldingsSummaryResponse,
  HoldingItem,
  HoldingCreateRequest,
  HoldingUpdateRequest,
  MarketNewsResponse,
  LiveQuoteResponse,
  QuarterlyResponse,
  AnnualResponse,
  RankingType,
  RankingsResponse,
  StreakResponse,
  IpoResponse,
} from "./types";

import { getApiBaseUrlOverride } from "../lib/preferences";

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8010";

export function getApiBaseUrl(): string {
  return getApiBaseUrlOverride() ?? DEFAULT_API_BASE_URL;
}

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : JSON.stringify(detail));
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail: unknown;
    try {
      detail = (await res.json()).detail;
    } catch {
      detail = res.statusText;
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export function getNews(market: Market, symbol: string, name?: string | null): Promise<NewsResponse> {
  const search = new URLSearchParams({ market, symbol });
  if (name) search.set("name", name);
  return request(`/api/news?${search.toString()}`);
}

export function postRefresh(market: Market | "BOTH"): Promise<{ status: string; markets: string[] }> {
  return request(`/api/refresh`, {
    method: "POST",
    body: JSON.stringify({ market }),
  });
}

export function getRefreshStatus(market?: Market): Promise<RefreshStatusResponse> {
  const search = market ? `?market=${market}` : "";
  return request(`/api/refresh/status/latest${search}`);
}

export function searchSymbols(
  q: string,
  market: Market | "ALL" = "ALL",
  limit = 20,
): Promise<SearchResponse> {
  const search = new URLSearchParams({ q, market, limit: String(limit) });
  return request(`/api/search?${search.toString()}`);
}

export function getStockDetail(market: Market, symbol: string): Promise<StockDetailResponse> {
  return request(`/api/stock/${market}/${symbol}`);
}

export function getStockHistory(
  market: Market,
  symbol: string,
  days = 180,
): Promise<StockHistoryResponse> {
  return request(`/api/stock/${market}/${symbol}/history?days=${days}`);
}

export function getStockPeers(
  market: Market,
  symbol: string,
  limit = 10,
): Promise<StockPeersResponse> {
  return request(`/api/stock/${market}/${symbol}/peers?limit=${limit}`);
}

export function getWatchlist(market: Market | "ALL" = "ALL"): Promise<WatchlistResponse> {
  return request(`/api/watchlist?market=${market}`);
}

export function addToWatchlist(market: Market, symbol: string): Promise<WatchlistItem> {
  return request(`/api/watchlist`, {
    method: "POST",
    body: JSON.stringify({ market, symbol }),
  });
}

export function removeFromWatchlist(market: Market, symbol: string): Promise<void> {
  return request(`/api/watchlist/${market}/${symbol}`, { method: "DELETE" });
}

export function getHoldings(): Promise<HoldingsResponse> {
  return request(`/api/holdings`);
}

export function getHoldingsSummary(): Promise<HoldingsSummaryResponse> {
  return request(`/api/holdings/summary`);
}

export function createHolding(payload: HoldingCreateRequest): Promise<HoldingItem> {
  return request(`/api/holdings`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateHolding(id: number, payload: HoldingUpdateRequest): Promise<HoldingItem> {
  return request(`/api/holdings/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteHolding(id: number): Promise<void> {
  return request(`/api/holdings/${id}`, { method: "DELETE" });
}

export function sellHolding(id: number, sellPrice: number, sellDate: string): Promise<HoldingItem> {
  return request(`/api/holdings/${id}/sell`, {
    method: "POST",
    body: JSON.stringify({ sell_price: sellPrice, sell_date: sellDate }),
  });
}

export function getMarketNews(market: Market, limit = 20): Promise<MarketNewsResponse> {
  return request(`/api/news/market?market=${market}&limit=${limit}`);
}

export function getIpos(market: Market): Promise<IpoResponse> {
  return request(`/api/ipo?market=${market}`);
}

export function getLiveQuote(market: Market, symbol: string): Promise<LiveQuoteResponse> {
  return request(`/api/stock/${market}/${symbol}/live`);
}

export function getStockQuarterly(market: Market, symbol: string): Promise<QuarterlyResponse> {
  return request(`/api/stock/${market}/${symbol}/quarterly`);
}

export function getStockAnnual(market: Market, symbol: string): Promise<AnnualResponse> {
  return request(`/api/stock/${market}/${symbol}/annual`);
}

export function getRankings(
  market: Market,
  type: RankingType,
  days: number,
  limit = 25,
): Promise<RankingsResponse> {
  return request(`/api/rankings?market=${market}&type=${type}&days=${days}&limit=${limit}`);
}

export function getRankingsStreak(
  market: Market,
  days: number,
  topN = 50,
  limit = 50,
): Promise<StreakResponse> {
  return request(`/api/rankings/streak?market=${market}&days=${days}&top_n=${topN}&limit=${limit}`);
}
