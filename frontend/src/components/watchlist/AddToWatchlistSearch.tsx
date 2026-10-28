import { useEffect, useRef, useState } from "react";
import { useSearch } from "../../hooks/useSearch";
import { useWatchlistMutations } from "../../hooks/useWatchlist";
import { FlagIcon } from "../common/FlagIcon";
import type { SearchResultItem } from "../../api/types";

export function AddToWatchlistSearch() {
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { add } = useWatchlistMutations();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 250);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const { data, isFetching } = useSearch(debounced);

  function handleAdd(item: SearchResultItem) {
    add.mutate({ market: item.market, symbol: item.symbol });
    setInput("");
    setDebounced("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-72">
      <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
        <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Add stock to watchlist…"
          className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none dark:text-slate-200"
        />
      </div>

      {open && debounced.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {isFetching && (
            <div className="px-3 py-2 text-sm text-slate-500">Searching…</div>
          )}
          {!isFetching && (data?.items ?? []).length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">No matches</div>
          )}
          {!isFetching && (data?.items ?? []).map((item) => (
            <button
              key={`${item.market}-${item.symbol}`}
              onClick={() => handleAdd(item)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{item.symbol}</span>
                {item.name && (
                  <span className="ml-2 text-slate-500 dark:text-slate-400">{item.name}</span>
                )}
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <FlagIcon code={item.market} /> {item.market}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
