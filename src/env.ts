import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

export const ENV = {
  SUPABASE_URL: extra.SUPABASE_URL as string,
  SUPABASE_ANON_KEY: extra.SUPABASE_ANON_KEY as string,
};
