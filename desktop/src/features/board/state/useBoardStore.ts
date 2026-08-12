import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { relayClient } from "@/shared/api/relayClient";
import type { RelayEvent } from "@/shared/api/types";
import {
  KIND_BOARD,
  KIND_BOARD_APPROVAL_DENIED,
  KIND_BOARD_APPROVAL_GRANTED,
  KIND_BOARD_APPROVAL_REQUESTED,
  KIND_BOARD_AUTONOMY_POLICY,
  KIND_BOARD_CARD,
  KIND_BOARD_FEED_RULE,
  KIND_BOARD_GOAL,
} from "@/shared/constants/kinds";

import { buildBoardState, type BoardState } from "./boardEvents";

/** Every event kind whose arrival can change a Board read model. */
export const BOARD_EVENT_KINDS = [
  KIND_BOARD,
  KIND_BOARD_CARD,
  KIND_BOARD_GOAL,
  KIND_BOARD_FEED_RULE,
  KIND_BOARD_AUTONOMY_POLICY,
  KIND_BOARD_APPROVAL_REQUESTED,
  KIND_BOARD_APPROVAL_GRANTED,
  KIND_BOARD_APPROVAL_DENIED,
] as const;

/** Shared cache key for the community-wide Board surface. */
export const boardQueryKey = ["board"] as const;

const BOARD_FETCH_LIMIT = 2_000;

/**
 * Loads the current Board event set and reconciles it into a safe UI state.
 *
 * Boards (30623) and cards (30624) are shared workspace objects and reconcile
 * by kind/`d` coordinate across authors. Goals, feed rules and autonomy
 * policies remain author-scoped.
 */
export async function fetchBoardState(): Promise<BoardState> {
  const events = await relayClient.fetchEvents({
    kinds: [...BOARD_EVENT_KINDS],
    limit: BOARD_FETCH_LIMIT,
  });
  return buildBoardState(events);
}

/** React Query entry point for the reconciled Board state. */
export function useBoardStateQuery() {
  return useQuery<BoardState>({
    queryKey: boardQueryKey,
    queryFn: fetchBoardState,
    staleTime: 30_000,
    // Live events normally invalidate immediately. This interval is the
    // backstop for a reconnect race or an event dropped by a relay.
    refetchInterval: 60_000,
  });
}

/**
 * Keeps Board state fresh while mounted. It subscribes only for future
 * events; the React Query fetch remains the single catch-up/read path.
 */
export function useBoardLiveUpdates(): void {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => Promise<void>) | undefined;
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: boardQueryKey });

    void relayClient
      .subscribeLive(
        { kinds: [...BOARD_EVENT_KINDS], limit: 0 },
        (_event: RelayEvent) => {
          void invalidate();
        },
      )
      .then((nextUnsubscribe) => {
        if (disposed) {
          void nextUnsubscribe();
        } else {
          unsubscribe = nextUnsubscribe;
        }
      })
      .catch((error) => {
        console.error("Failed to subscribe to Board updates", error);
      });

    // A reconnect can have a gap between the server's current state and the
    // live subscription's replay window. Re-fetch rather than hoping that a
    // later event happens to repair that gap.
    const unsubscribeReconnect = relayClient.subscribeToReconnects(() => {
      void invalidate();
    });

    return () => {
      disposed = true;
      unsubscribeReconnect();
      if (unsubscribe) void unsubscribe();
    };
  }, [queryClient]);
}
