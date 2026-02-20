import React, { useMemo, useCallback } from "react";
import FeedView from "./FeedView";
import { useResolvedLocation } from "@hooks/useResolvedLocation";
import { useEdgeFeed } from "@hooks/useEdgeFeed";
import { useDailyPulse } from "@hooks/useDailyPulse";
import { useSession } from "@state/useSession";

export default function FeedScreen({ navigation }: { navigation: any }) {
  const { session } = useSession();
  const isGuest = !session;

  const { locationId, loading: locLoading } = useResolvedLocation();
  const hasValidLocation = Boolean(locationId);

  const { jobs, loading, refresh, premium, new_jobs_count } = useEdgeFeed(
    hasValidLocation ? locationId : null,
    premium?.scope ?? "local", // 🔒 backend authoritative
  );

  const isPremium = premium?.active === true;

  const items = useMemo(() => jobs ?? [], [jobs]);
  const dailyPulseCount = useDailyPulse(new_jobs_count ?? 0);

  const handleSetScope = useCallback(
    (scope: "local" | "national") => {
      if (!isPremium) return;

      // Only premium can request scope change
      // Backend will sanitize if needed
      refresh();
    },
    [isPremium, refresh],
  );

  return (
    <FeedView
      navigation={navigation}
      items={items}
      loading={loading || locLoading}
      refresh={refresh}
      premium={premium}
      requestedScope={premium?.scope ?? "local"} // 🔒 authoritative
      setRequestedScope={isPremium ? handleSetScope : undefined}
      dailyPulseCount={dailyPulseCount}
      isGuest={isGuest}
    />
  );
}
