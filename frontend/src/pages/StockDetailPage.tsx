import { useParams } from "react-router-dom";
import { useStockDetail } from "../hooks/useStockDetail";
import { useLiveQuote } from "../hooks/useLiveQuote";
import { useWatchlist, useWatchlistMutations } from "../hooks/useWatchlist";
import { useStockHistory } from "../hooks/useStockHistory";
import { PriceVolumeChart } from "../components/stock-detail/PriceVolumeChart";
import { PeerComparisonTable } from "../components/stock-detail/PeerComparisonTable";
import { StockNewsInline } from "../components/stock-detail/StockNewsInline";
import { FundamentalsTab } from "../components/stock-detail/tabs/FundamentalsTab";
import { SkeletonChart } from "../components/common/Skeleton";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { FlagIcon } from "../components/common/FlagIcon";
import { ApiError } from "../api/client";
import { downloadCsv } from "../lib/csv";
import type { Market } from "../api/types";

const CURRENCY: Record<string, string> = { IN: "₹" };

function formatMarketCap(v: number | null, market: string): string {
  if (v === null) return "—";
  const c = CURRENCY[market] ?? "";
  if (v >= 1e12) return `${c}${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${c}${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e7) return `${c}${(v / 1e7).toFixed(0)}cr`;
  return `${c}${(v / 1e6).toFixed(0)}M`;
}

function fmt(v: number | null, decimals = 2): string {
  if (v === null) return "—";
  return v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function StockDetailPage() {
  const { market, symbol } = useParams<{ market: Market; symbol: string }>();

  const { data: detail, isLoading, error } = useStockDetail(market as Market, symbol ?? "");
  const { data: liveQuote } = useLiveQuote(market as Market, symbol ?? "");
  const { data: watchlist } = useWatchlist("ALL");
  const { add, remove } = useWatchlistMutations();
  const { data: history, isLoading: histLoading } = useStockHistory(market as Market, symbol ?? "", 365);

  if (!market || !symbol) return <ErrorBanner message="Missing market or symbol in URL." />;
  if (isLoading) return <div className="mx-auto max-w-4xl px-4 py-6"><LoadingSpinner label="Loading stock…" /></div>;

  const safeMarket = market as Market;
  const safeSymbol = symbol;

  if (error) {
    const message =
      error instanceof ApiError && error.status === 404
        ? `Unknown symbol ${symbol} for market ${market}.`
        : "Failed to load stock detail.";
    return <div className="mx-auto max-w-4xl px-4 py-6"><ErrorBanner message={message} /></div>;
  }

  if (!detail) return null;

  const isLive = Boolean(liveQuote?.is_market_open && liveQuote?.price !== null);
  const price = isLive ? liveQuote!.price : (detail.latest?.close ?? null);
  const pct = isLive ? liveQuote!.change_pct : (detail.latest?.pct_change ?? null);
  const isUp = pct !== null && pct >= 0;
  const currency = CURRENCY[safeMarket] ?? "";
  const f = detail.fundamentals;
  const pb = f?.book_value && price ? price / f.book_value : null;

  const isWatched = watchlist?.items.some((i) => i.market === safeMarket && i.symbol === safeSymbol) ?? false;

  function toggleFollow() {
    if (isWatched) remove.mutate({ market: safeMarket, symbol: safeSymbol });
    else add.mutate({ market: safeMarket, symbol: safeSymbol });
  }

  function handleExport() {
    if (!history) return;
    downloadCsv(
      history.points,
      [
        { key: "trade_date", header: "Date" },
        { key: "open", header: "Open" },
        { key: "high", header: "High" },
        { key: "low", header: "Low" },
        { key: "close", header: "Close" },
        { key: "volume", header: "Volume" },
      ],
      `${safeSymbol}_${safeMarket}_history.csv`,
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {detail.name ?? symbol}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
              <FlagIcon code={safeMarket} /> {safeSymbol}
            </span>
            {detail.sector && (
              <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-medium text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                {detail.sector}
              </span>
            )}
            {detail.industry && (
              <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {detail.industry}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-start gap-6">
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <div className="text-xs text-slate-400">{isLive ? "Live price" : "Last close"}</div>
              {isLive && (
                <span className="flex items-center gap-1 text-xs text-emerald-500">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />LIVE
                </span>
              )}
            </div>
            {price !== null ? (
              <>
                <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {currency}{fmt(price)}
                </div>
                {pct !== null && (
                  <div className={`text-sm font-medium ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {isUp ? "▲" : "▼"} {fmt(Math.abs(pct))}%
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-400">No price data yet</div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={toggleFollow}
              disabled={add.isPending || remove.isPending}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                isWatched
                  ? "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
                  : "bg-cyan-600 text-white hover:bg-cyan-700"
              }`}
            >
              {isWatched ? "★ Following" : "☆ Follow"}
            </button>
            <button
              onClick={handleExport}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── Key stats grid ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Market cap", value: formatMarketCap(f?.market_cap ?? null, safeMarket) },
          { label: "P/E (trailing)", value: fmt(f?.pe_ratio ?? null) },
          { label: "P/B", value: fmt(pb) },
          { label: "ROE", value: f?.roe != null ? `${fmt(f.roe * 100, 1)}%` : "—" },
          { label: "Dividend yield", value: f?.dividend_yield != null ? `${fmt(f.dividend_yield)}%` : "—" },
          { label: "Debt / Equity", value: f?.debt_to_equity != null ? fmt(f.debt_to_equity) : "—" },
          { label: "52W high", value: detail.week52_high != null ? `${currency}${fmt(detail.week52_high)}` : "—" },
          { label: "52W low", value: detail.week52_low != null ? `${currency}${fmt(detail.week52_low)}` : "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="text-xs text-slate-400">{s.label}</div>
            <div className="mt-0.5 font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Price chart (1Y) ── */}
      <div>
        {histLoading && <SkeletonChart />}
        {history && history.points.length > 0 && (
          <PriceVolumeChart points={history.points} visibleDays={365} />
        )}
        {history && history.points.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No price history available.</p>
        )}
      </div>

      {/* ── Peers ── */}
      <PeerComparisonTable market={safeMarket} symbol={safeSymbol} />

      {/* ── News ── */}
      <StockNewsInline market={safeMarket} symbol={safeSymbol} name={detail.name} />

      {/* ── Financial statements ── */}
      <FundamentalsTab market={safeMarket} symbol={safeSymbol} detail={detail} />

    </div>
  );
}
