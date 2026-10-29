import { Link } from "react-router-dom";
import type { Market, RecentIpo, UpcomingIpo } from "../../api/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(raw: string | null): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw; // already human-readable (e.g. "10-Mar-2025")
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtPrice(n: number | null): string {
  if (n == null) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

// ── status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s === "open"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : s === "allotment"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}

// ── upcoming IPOs panel ───────────────────────────────────────────────────────

function UpcomingPanel({ items }: { items: UpcomingIpo[] }) {
  return (
    <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Upcoming IPOs
        </h3>
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          No upcoming IPOs at this time.
        </p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((ipo, i) => (
            <div key={i} className="px-5 py-3.5">
              <div className="mb-1.5 flex items-start justify-between gap-3">
                <span className="text-[14px] font-semibold leading-tight text-slate-900 dark:text-white">
                  {ipo.company_name}
                </span>
                <StatusBadge status={ipo.status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500 dark:text-slate-400">
                {ipo.price_band && (
                  <span>
                    <span className="text-slate-400 dark:text-slate-500">Price </span>
                    ₹{ipo.price_band}
                  </span>
                )}
                {ipo.open_date && (
                  <span>
                    <span className="text-slate-400 dark:text-slate-500">Open </span>
                    {fmtDate(ipo.open_date)}
                  </span>
                )}
                {ipo.close_date && (
                  <span>
                    <span className="text-slate-400 dark:text-slate-500">Close </span>
                    {fmtDate(ipo.close_date)}
                  </span>
                )}
                {ipo.listing_date && (
                  <span>
                    <span className="text-slate-400 dark:text-slate-500">Listing </span>
                    {fmtDate(ipo.listing_date)}
                  </span>
                )}
                <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {ipo.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── recently listed panel ─────────────────────────────────────────────────────

function RecentPanel({ items, market }: { items: RecentIpo[]; market: Market }) {
  return (
    <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <span className="h-2 w-2 rounded-full bg-cyan-400" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Listed Last 6 Months
        </h3>
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          No recent listings available.
        </p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((ipo, i) => {
            const positive = ipo.gain_pct != null && ipo.gain_pct >= 0;
            const gainColor = ipo.gain_pct == null
              ? "text-slate-400"
              : positive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-500 dark:text-red-400";

            return (
              <div key={i} className="px-5 py-3.5">
                <div className="mb-1.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {ipo.symbol ? (
                      <Link
                        to={`/stock/${market}/${ipo.symbol}`}
                        className="text-[14px] font-semibold leading-tight text-cyan-600 hover:underline dark:text-cyan-400"
                      >
                        {ipo.company_name}
                      </Link>
                    ) : (
                      <span className="text-[14px] font-semibold leading-tight text-slate-900 dark:text-white">
                        {ipo.company_name}
                      </span>
                    )}
                    {ipo.symbol && (
                      <span className="ml-2 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        {ipo.symbol}
                      </span>
                    )}
                  </div>
                  {ipo.gain_pct != null && (
                    <span className={`shrink-0 text-[13px] font-bold tabular-nums ${gainColor}`}>
                      {positive ? "+" : ""}{ipo.gain_pct.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500 dark:text-slate-400">
                  <span>
                    <span className="text-slate-400 dark:text-slate-500">Listed </span>
                    {fmtDate(ipo.listing_date)}
                  </span>
                  {ipo.issue_price != null && (
                    <span>
                      <span className="text-slate-400 dark:text-slate-500">Issue </span>
                      {fmtPrice(ipo.issue_price)}
                    </span>
                  )}
                  {ipo.listing_price != null && (
                    <span>
                      <span className="text-slate-400 dark:text-slate-500">Listed @ </span>
                      {fmtPrice(ipo.listing_price)}
                    </span>
                  )}
                  {ipo.current_price != null && (
                    <span>
                      <span className="text-slate-400 dark:text-slate-500">Now </span>
                      <span className={gainColor}>{fmtPrice(ipo.current_price)}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── section ───────────────────────────────────────────────────────────────────

interface Props {
  upcoming: UpcomingIpo[];
  recent: RecentIpo[];
  market: Market;
  isLoading: boolean;
}

export function IpoSection({ upcoming, recent, market, isLoading }: Props) {
  if (isLoading) return null; // don't show skeleton — news section already shows loading state

  const hasData = upcoming.length > 0 || recent.length > 0;

  return (
    <div className="mt-10 border-t border-slate-200 pt-8 dark:border-slate-800">
      {/* Section header */}
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">IPO Tracker</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          NSE Main Board &amp; SME — subscription status and recent listings
        </p>
      </div>

      {!hasData ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          IPO data unavailable — NSE API did not respond.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <UpcomingPanel items={upcoming} />
          <RecentPanel items={recent} market={market} />
        </div>
      )}
    </div>
  );
}
