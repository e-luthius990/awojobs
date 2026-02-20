import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const APPLIED_KEY = "applied_job_ids";

function safeParse(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useAppliedJobs(jobId: string) {
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  /* ---------------- INITIAL LOAD ---------------- */
  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(APPLIED_KEY)
      .then((raw) => {
        if (!mounted) return;
        const ids = safeParse(raw);
        setAppliedIds(new Set(ids));
      })
      .catch(() => {
        if (!mounted) return;
        setAppliedIds(new Set());
      });

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------- DERIVED STATE ---------------- */
  const applied = appliedIds.has(jobId);

  /* ---------------- MARK APPLIED ---------------- */
  const markApplied = useCallback(
    async (id: string) => {
      if (appliedIds.has(id)) return;

      const updated = new Set(appliedIds);
      updated.add(id);

      setAppliedIds(updated);

      try {
        await AsyncStorage.setItem(
          APPLIED_KEY,
          JSON.stringify(Array.from(updated))
        );
      } catch {
        // fail silently — DB is real truth
      }
    },
    [appliedIds]
  );

  return { applied, markApplied };
}
