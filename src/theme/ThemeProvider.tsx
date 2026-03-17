import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Appearance, type ColorSchemeName } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { createThemeTokens } from "./tokens";
import type {
  ThemeContextValue,
  ThemeMode,
  ThemePreference,
} from "./theme.types";

const STORAGE_KEY = "@awojobs/theme-preference";
const DEFAULT_PREFERENCE: ThemePreference = "light";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveMode(
  preference: ThemePreference,
  systemScheme: ColorSchemeName,
): ThemeMode {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return systemScheme === "dark" ? "dark" : "light";
}

function parseStoredPreference(value: string | null): ThemePreference {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return DEFAULT_PREFERENCE;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const isMountedRef = useRef(true);

  const [preference, setPreferenceState] =
    useState<ThemePreference>(DEFAULT_PREFERENCE);
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme(),
  );

  useEffect(() => {
    isMountedRef.current = true;

    const loadPreference = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!isMountedRef.current) return;

        setPreferenceState(parseStoredPreference(raw));
      } catch {
        // Keep current live preference.
      }
    };

    void loadPreference();

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (!isMountedRef.current) return;
      setSystemScheme(colorScheme);
    });

    return () => {
      isMountedRef.current = false;
      subscription.remove();
    };
  }, []);

  const mode = useMemo<ThemeMode>(() => {
    return resolveMode(preference, systemScheme);
  }, [preference, systemScheme]);

  const theme = useMemo(() => {
    return createThemeTokens(mode);
  }, [mode]);

  const setPreference = useCallback(
    async (nextPreference: ThemePreference) => {
      if (nextPreference === preference) return;

      if (isMountedRef.current) {
        setPreferenceState(nextPreference);
      }

      try {
        await AsyncStorage.setItem(STORAGE_KEY, nextPreference);
      } catch {
        // Keep live state even if persistence fails.
      }
    },
    [preference],
  );

  const toggleTheme = useCallback(async () => {
    const nextPreference: ThemePreference = mode === "dark" ? "light" : "dark";
    await setPreference(nextPreference);
  }, [mode, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      mode,
      preference,
      isDark: theme.isDark,
      setPreference,
      toggleTheme,
    }),
    [theme, mode, preference, setPreference, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export { ThemeContext };
