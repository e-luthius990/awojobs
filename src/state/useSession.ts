import { useEffect, useState } from "react";
import { supabase } from "../core/supabase";
import type { Session } from "@supabase/supabase-js";

/* =====================================================
   GLOBAL SINGLETON AUTH STATE
===================================================== */

let cachedSession: Session | null = null;
let initialized = false;
let initializingPromise: Promise<void> | null = null;
let subscribers: ((session: Session | null) => void)[] = [];

/* =====================================================
   INTERNAL INIT (SAFE SINGLETON)
===================================================== */

async function initAuth() {
  if (initialized) return;

  if (!initializingPromise) {
    initializingPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      cachedSession = data.session ?? null;

      supabase.auth.onAuthStateChange((_event, session) => {
        cachedSession = session ?? null;
        subscribers.forEach((cb) => cb(cachedSession));
      });

      initialized = true;
    })();
  }

  return initializingPromise;
}

/* =====================================================
   HOOK
===================================================== */

export function useSession() {
  const [session, setSession] = useState<Session | null>(cachedSession);
  const [loading, setLoading] = useState(!initialized);

  useEffect(() => {
    let active = true;

    initAuth().then(() => {
      if (!active) return;

      setSession(cachedSession);
      setLoading(false);

      const handler = (s: Session | null) => {
        if (!active) return;
        setSession(s);
      };

      subscribers.push(handler);

      return () => {
        subscribers = subscribers.filter((h) => h !== handler);
      };
    });

    return () => {
      active = false;
    };
  }, []);

  return { session, loading };
}
