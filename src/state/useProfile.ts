import { useEffect, useState } from "react";
import { supabase } from "../core/supabase";
import { useSession } from "./useSession";

export type Profile = {
  id: string;
  phone_number: string;
  resolved_location_id?: string | null;
};

export function useProfile() {
  const { session } = useSession();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Guest → no profile
    if (!session) {
      setProfile(null);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, phone_number, resolved_location_id")
        .single();

      if (!mounted) return;

      if (error) {
        setProfile(null);
      } else {
        setProfile(data as Profile);
      }

      setLoading(false);
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [session]);

  return { profile, loading };
}
