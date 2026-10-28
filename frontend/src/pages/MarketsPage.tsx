import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useRankings } from "../hooks/useRankings";
import { getRankingsStreak } from "../api/client";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorBanner } from "../components/common/ErrorBanner";
import type { RankingType, RankingItem, StreakItem } from "../api/types";

const TABS: { type: RankingType; label: string }[] = [
  { type: "gainers",  label: "Top Gainers" },
  { type: "losers",   label: "Top Losers" },
  { type: "volume",   label: "Most Active" },
  { type: "trending", label: "Trending" },
  { type: "streak",   label: "Streak" },
];

const PERIODS: { days: number; label: string }[] = [
  { days: 1,  label: "1D" },
  { days: 5,  label: "5D" },
  { days: 30, label: "1M" },
  { days: 90, label: "3M" },
];

function fmtVol(v: number | null): string {
  if (v === null) return "—";
  if (v >= 1e7) return `${(v / 1e7).toFixed(2)}cr`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(2)}L`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
}

function fmtPrice(v: number | null): string {
  if (v === null) return "—";
  return `₹${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pctColor(v: number | null) {
  if (v === null) return "text-slate-400";
  return v >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
}

// ── Standard rankings table ────────────────────────────────────────────────────
function RankTable({ items, type }: { items: RankingItem[]; type: RankingType }) {
  const navigate = useNavigate();
  if (items.length === 0) return <p className="py-8 text-center text-sm text-slate-400">No data available.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3 text-left">#</th>
            <th className="px-4 py-3 text-left">Symbol</th>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3 text-right">{type === "volume" ? "Volume" : "Change"}</th>
            {type === "trending" && <th className="px-4 py-3 text-right">Rel Vol</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item, i) => {
            const pct = item.pct_change;
            const isUp = pct !== null && pct >= 0;
            return (
              <tr
                key={item.symbol}
                onClick={() => navigate(`/stock/IN/${item.symbol}`)}
                className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60"
              >
                <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-400 dark:text-slate-600">{i + 1}</td>
                <td className="px-4 py-3 font-mono font-semibold text-cyan-600 dark:text-cyan-400">{item.symbol}</td>
                <td className="max-w-[220px] truncate px-4 py-3 text-slate-600 dark:text-slate-400">{item.name ?? "—"}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">{fmtPrice(item.close)}</td>
                <td className={`px-4 py-3 text-right font-mono tabular-nums font-semibold ${type === "volume" ? "text-slate-700 dark:text-slate-300" : pctColor(pct)}`}>
                  {type === "volume"
                    ? fmtVol(item.volume)
                    : pct === null ? "—" : `${isUp ? "+" : ""}${pct.toFixed(2)}%`}
                </td>
                {type === "trending" && (
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-violet-600 dark:text-violet-400">
                    {item.rel_volume !== null ? `${item.rel_volume.toFixed(2)}×` : "—"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Streak table ───────────────────────────────────────────────────────────────
function StreakTable({ items, dates }: { items: StreakItem[]; dates: string[] }) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
        <p className="text-sm font-medium text-slate-500">No stocks qualified for all {dates.length} days.</p>
        <p className="mt-1 text-xs text-slate-400">Try a smaller number of days or increase the top-N pool.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3 text-left">#</th>
            <th className="px-4 py-3 text-left">Symbol</th>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3 text-right">Today</th>
            <th className="px-4 py-3 text-right">Avg gain</th>
            <th className="px-4 py-3 text-left">Daily gains (oldest → newest)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item, i) => (
            <tr
              key={item.symbol}
              onClick={() => navigate(`/stock/IN/${item.symbol}`)}
              className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60"
            >
              <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-400 dark:text-slate-600">{i + 1}</td>
              <td className="px-4 py-3 font-mono font-semibold text-cyan-600 dark:text-cyan-400">{item.symbol}</td>
              <td className="max-w-[180px] truncate px-4 py-3 text-slate-600 dark:text-slate-400">{item.name ?? "—"}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">{fmtPrice(item.close)}</td>
              <td className={`px-4 py-3 text-right font-mono tabular-nums font-semibold ${pctColor(item.pct_change_today)}`}>
                {item.pct_change_today !== null ? `${item.pct_change_today >= 0 ? "+" : ""}${item.pct_change_today.toFixed(2)}%` : "—"}
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                +{item.avg_pct_change.toFixed(2)}%
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {item.history.map((h) => (
                    <span
                      key={h.date}
                      title={h.date}
                      className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    >
                      +{h.pct_change.toFixed(1)}%
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Streak controls ────────────────────────────────────────────────────────────
function StreakView() {
  const [inputVal, setInputVal] = useState("3");
  const [days, setDays] = useState(3);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rankings-streak", "IN", days],
    queryFn: () => getRankingsStreak("IN", days, 50, 50),
    staleTime: 5 * 60_000,
  });

  function handleApply() {
    const n = parseInt(inputVal, 10);
    if (!isNaN(n) && n >= 2 && n <= 20) setDays(n);
  }

  return (
    <div>
      {/* Input row */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Show stocks that were in the <span className="font-semibold text-slate-800 dark:text-slate-200">top 50 gainers</span> on every one of the last
        </p>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="number"
            min={2}
            max={20}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
            className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center font-mono text-sm font-semibold text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <span className="text-sm text-slate-600 dark:text-slate-400">trading days</span>
          <button
            onClick={handleApply}
            className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700"
          >
            Apply
          </button>
        </div>
        {/* Quick presets */}
        <div className="flex gap-1">
          {[2, 3, 5, 7, 10].map((n) => (
            <button
              key={n}
              onClick={() => { setInputVal(String(n)); setDays(n); }}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                days === n
                  ? "bg-cyan-600 text-white"
                  : "border border-slate-200 text-slate-600 hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-700 dark:text-slate-400"
              }`}
            >
              {n}d
            </button>
          ))}
        </div>
      </div>

      {/* Result meta */}
      {data && !isLoading && (
        <p className="mb-3 text-xs text-slate-400">
          Searching across dates: {data.dates.join(" · ")} · {data.items.length} stock{data.items.length !== 1 ? "s" : ""} qualified
        </p>
      )}

      {isLoading && <LoadingSpinner label="Scanning streak…" />}
      {error && <ErrorBanner message="Failed to load streak data." />}
      {data && !isLoading && <StreakTable items={data.items} dates={data.dates} />}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export function MarketsPage() {
  const [activeType, setActiveType] = useState<RankingType>("gainers");
  const [activeDays, setActiveDays] = useState(1);

  const isStreak = activeType === "streak";
  const { data, isLoading, error } = useRankings(
    "IN",
    isStreak ? "gainers" : activeType,   // streak has its own query below
    activeDays,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Markets</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">NSE India · top movers</p>
      </div>

      {/* Tab bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
          {TABS.map((tab) => (
            <button
              key={tab.type}
              onClick={() => setActiveType(tab.type)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                activeType === tab.type
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Period selector — only for non-trending, non-streak tabs */}
        {activeType !== "trending" && activeType !== "streak" && (
          <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setActiveDays(p.days)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  activeDays === p.days
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {isStreak ? (
        <StreakView />
      ) : (
        <>
          {isLoading && <LoadingSpinner label="Loading…" />}
          {error && <ErrorBanner message="Failed to load rankings." />}
          {data && !isLoading && <RankTable items={data.items} type={activeType} />}
        </>
      )}
    </div>
  );
}
