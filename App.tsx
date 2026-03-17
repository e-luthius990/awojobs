import "react-native-gesture-handler";

import { useCallback, useEffect, useRef, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { View, StyleSheet } from "react-native";

import { RootNavigator } from "./src/navigation/RootNavigator";
import { ThemeProvider } from "./src/theme/ThemeProvider";
import { useTheme } from "./src/theme/useTheme";
import { useSession } from "./src/state/useSession";
import { useProfile } from "./src/state/useProfile";

void SplashScreen.preventAutoHideAsync();

const linking = {
  prefixes: ["awojobs://", "https://awojobs.app"],
  config: {
    screens: {
      App: {
        screens: {
          FeedTab: {
            screens: {
              JobDetail: "job/:id",
            },
          },
        },
      },
      AuthModal: {
        screens: {
          OTP: "auth/otp",
        },
      },
    },
  },
};

const NATIVE_SPLASH_FAILSAFE_MS = 4000;

function AppBootstrap() {
  const { theme } = useTheme();

  const [navigationReady, setNavigationReady] = useState(false);
  const [nativeSplashHidden, setNativeSplashHidden] = useState(false);

  const hideCalledRef = useRef(false);

  const { session, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;
  const { loading: profileLoading } = useProfile(userId);

  const profileBootstrapLoading = Boolean(session) && profileLoading;
  const appReady =
    navigationReady && !sessionLoading && !profileBootstrapLoading;

  const hideNativeSplash = useCallback(async () => {
    if (hideCalledRef.current) return;
    hideCalledRef.current = true;

    try {
      await SplashScreen.hideAsync();
    } catch {
      // ignore
    } finally {
      setNativeSplashHidden(true);
    }
  }, []);

  const handleNavigationReady = useCallback(() => {
    setNavigationReady(true);
  }, []);

  useEffect(() => {
    if (appReady && !nativeSplashHidden) {
      void hideNativeSplash();
    }
  }, [appReady, nativeSplashHidden, hideNativeSplash]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!nativeSplashHidden) {
        void hideNativeSplash();
      }
    }, NATIVE_SPLASH_FAILSAFE_MS);

    return () => clearTimeout(timer);
  }, [nativeSplashHidden, hideNativeSplash]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bgApp }]}>
      <NavigationContainer linking={linking} onReady={handleNavigationReady}>
        <RootNavigator />
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppBootstrap />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
