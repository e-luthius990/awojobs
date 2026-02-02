import { supabase } from "../core/supabase";

export async function setPushOptIn(enabled: boolean) {
  const { error } = await supabase.from("profiles").update({
    push_opt_in: enabled,
    // Optional: if disabling, also clear token
    // expo_push_token: enabled ? undefined : null,
  });

  if (error) throw error;
}
