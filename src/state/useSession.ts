import { useEffect, useState } from "react";
import { supabase } from "../core/supabase";
import { Session } from "@supabase/supabase-js";
import { ENV } from "../core/config";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // 🔑 DEV MODE: bypass auth entirely
        if (ENV.DEV_AUTH_BYPASS) {
          if (mounted) {
            setSession({} as Session); // mock non-null session
            setLoading(false);
          }
          return;
        }

        const { data, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.warn("getSession error:", error.message);
          setSession(null);
        } else {
          setSession(data.session);
        }
      } catch (err) {
        console.warn("Session init failed:", err);
        if (mounted) setSession(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    // 🔕 Do NOT listen to auth changes in dev mode
    if (ENV.DEV_AUTH_BYPASS) return;

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) setSession(session);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}
