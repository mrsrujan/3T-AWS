import { useQuery } from "@tanstack/react-query";
import { getRankings } from "../api/client";
import type { Market, RankingType } from "../api/types";

export function useRankings(market: Market, type: RankingType, days: number) {
  return useQuery({
    queryKey: ["rankings", market, type, days],
    queryFn: () => getRankings(market, type, days, 25),
    staleTime: 5 * 60_000,
  });
}
