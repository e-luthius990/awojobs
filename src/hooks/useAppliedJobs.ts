import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const APPLIED_KEY = "applied_job_ids";

function safeParse(raw: string | null): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (v): v is string => typeof v === "string" && v.trim().length > 0,
        )
      : [];
  } catch {
    return [];
  }
}

export function useAppliedJobs(jobId: string) {
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(APPLIED_KEY)
      .then((raw) => {
        if (!mounted) return;
        setAppliedIds(new Set(safeParse(raw)));
      })
      .catch(() => {
        if (!mounted) return;
        setAppliedIds(new Set());
      });

    return () => {
      mounted = false;
    };
  }, []);

  const applied = appliedIds.has(jobId);

  const markApplied = useCallback(async (id: string) => {
    let didChange = false;
    let nextIds: string[] = [];

    setAppliedIds((prev) => {
      if (prev.has(id)) return prev;

      const next = new Set(prev);
      next.add(id);
      nextIds = Array.from(next);
      didChange = true;
      return next;
    });

    if (!didChange) return;

    try {
      await AsyncStorage.setItem(APPLIED_KEY, JSON.stringify(nextIds));
    } catch {
      // DB remains the real source of truth
    }
  }, []);

  return { applied, markApplied };
}