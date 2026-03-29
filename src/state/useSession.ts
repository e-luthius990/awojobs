import { useEffect, useState } from "react";
import { supabase } from "../core/supabase";
import type { Session } from "@supabase/supabase-js";

type SessionErrorCode =
  | "SESSION_BOOTSTRAP_FAILED"
  | "SESSION_EXPIRED"
  | null;

let cachedSession: Session | null = null;
let initialized = false;
let sessionErrorCode: SessionErrorCode = null;
let initializingPromise: Promise<void> | null = null;

const subscribers = new Set<
  (session: Session | null, initialized: boolean, errorCode: SessionErrorCode) => void
>();

let authSubscription: { unsubscribe: () => void } | null = null;

function isSameSession(a: Session | null, b: Session | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    a.access_token === b.access_token &&
    a.refresh_token === b.refresh_token &&
    a.user?.id === b.user?.id
  );
}

function broadcast() {
  subscribers.forEach((cb) => cb(cachedSession, initialized, sessionErrorCode));
}

function setStoreSession(session: Session | null) {
  if (isSameSession(cachedSession, session)) return;
  cachedSession = session;
  broadcast();
}

function setInitialized(next: boolean) {
  if (initialized === next) return;
  initialized = next;
  broadcast();
}

function setSessionErrorCode(next: SessionErrorCode) {
  if (sessionErrorCode === next) return;
  sessionErrorCode = next;
  broadcast();
}

function subscribe(
  cb: (session: Session | null, initialized: boolean, errorCode: SessionErrorCode) => void,
) {
  subscribers.add(cb);
  cb(cachedSession, initialized, sessionErrorCode);

  return () => {
    subscribers.delete(cb);
  };
}

function classifySessionError(error: unknown): SessionErrorCode {
  const message =
    error instanceof Error ? error.message : String(error ?? "");

  const normalized = message.toLowerCase();

  if (
    normalized.includes("refresh token") ||
    normalized.includes("jwt") ||
    normalized.includes("session")
  ) {
    return "SESSION_EXPIRED";
  }

  return "SESSION_BOOTSTRAP_FAILED";
}

export async function syncSessionFromSupabase() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    setSessionErrorCode(null);
    setStoreSession(data.session ?? null);
  } catch (error) {
    setStoreSession(null);
    setSessionErrorCode(classifySessionError(error));
    setInitialized(true);
  }
}

async function initAuth() {
  if (initialized) return;
  if (initializingPromise) return initializingPromise;

  initializingPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      setSessionErrorCode(null);
      setStoreSession(data.session ?? null);

      if (!authSubscription) {
        const { data: listenerData } = supabase.auth.onAuthStateChange(
          (event, session) => {
            switch (event) {
              case "INITIAL_SESSION":
              case "SIGNED_IN":
              case "TOKEN_REFRESHED":
              case "USER_UPDATED":
                setSessionErrorCode(null);
                setStoreSession(session ?? null);
                break;

              case "SIGNED_OUT":
                setSessionErrorCode(null);
                setStoreSession(null);
                break;

              default:
                break;
            }
          },
        );

        authSubscription = listenerData.subscription;
      }
    } catch (error) {
      setStoreSession(null);
      setSessionErrorCode(classifySessionError(error));
    } finally {
      setInitialized(true);
      initializingPromise = null;
    }
  })();

  return initializingPromise;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(cachedSession);
  const [loading, setLoading] = useState<boolean>(!initialized);
  const [errorCode, setErrorCode] = useState<SessionErrorCode>(sessionErrorCode);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribe((nextSession, nextInitialized, nextErrorCode) => {
      if (!active) return;

      setSession((prev) =>
        isSameSession(prev, nextSession) ? prev : nextSession,
      );
      setLoading(!nextInitialized);
      setErrorCode(nextErrorCode);
    });

    void initAuth();

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
    errorCode,
  };
}