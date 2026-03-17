import { useEffect, useState } from "react";
import { supabase } from "../core/supabase";
import type { Session } from "@supabase/supabase-js";

/* =====================================================
   GLOBAL AUTH SINGLETON
===================================================== */

let cachedSession: Session | null = null;
let initialized = false;
let initializingPromise: Promise<void> | null = null;
const subscribers = new Set<(session: Session | null) => void>();
let authSubscription: { unsubscribe: () => void } | null = null;

/* =====================================================
   SESSION COMPARISON
===================================================== */

function isSameSession(a: Session | null, b: Session | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    a.access_token === b.access_token &&
    a.refresh_token === b.refresh_token &&
    a.user?.id === b.user?.id
  );
}

/* =====================================================
   BROADCAST
===================================================== */

function notify(session: Session | null) {
  if (isSameSession(cachedSession, session)) return;

  cachedSession = session;
  subscribers.forEach((cb) => cb(session));
}

function subscribe(cb: (session: Session | null) => void) {
  subscribers.add(cb);
  cb(cachedSession);

  return () => {
    subscribers.delete(cb);
  };
}

/* =====================================================
   FORCE SYNC
===================================================== */

export async function syncSessionFromSupabase() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    notify(data.session ?? null);
  } catch {
    // Keep current cached state unchanged on sync failure.
  }
}

/* =====================================================
   INIT
===================================================== */

async function initAuth() {
  if (initialized) return;
  if (initializingPromise) return initializingPromise;

  initializingPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      cachedSession = data.session ?? null;

      if (!authSubscription) {
        const { data: listenerData } = supabase.auth.onAuthStateChange(
          (event, session) => {
            switch (event) {
              case "INITIAL_SESSION":
              case "SIGNED_IN":
              case "TOKEN_REFRESHED":
              case "USER_UPDATED":
                notify(session ?? null);
                break;

              case "SIGNED_OUT":
                notify(null);
                break;

              default:
                break;
            }
          },
        );

        authSubscription = listenerData.subscription;
      }

      initialized = true;
    } finally {
      initializingPromise = null;
    }
  })();

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

    const unsubscribe = subscribe((nextSession) => {
      if (!active) return;

      setSession((prev) =>
        isSameSession(prev, nextSession) ? prev : nextSession,
      );
    });

    const start = async () => {
      try {
        await initAuth();
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void start();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return {
    session,
    loading,
    isAuthenticated: !!session,
    user: session?.user ?? null,
  };
}