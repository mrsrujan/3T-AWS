import { useQuery } from "@tanstack/react-query";
import { getIpos } from "../api/client";
import type { Market } from "../api/types";

export function useIpos(market: Market) {
  return useQuery({
    queryKey: ["ipos", market],
    queryFn: () => getIpos(market),
    staleTime: 60 * 60 * 1000,
  });
}
