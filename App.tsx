import "react-native-gesture-handler";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  NavigationContainer,
  createNavigationContainerRef,
  type LinkingOptions,
  type NavigationState,
  type PartialState,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { StyleSheet, View, Text, Pressable } from "react-native";

import {
  RootNavigator,
  type RootStackParamList,
} from "./src/navigation/RootNavigator";
import { ThemeProvider } from "./src/theme/ThemeProvider";
import { useSession } from "./src/state/useSession";
import LaunchScreen from "./src/ui/LaunchScreen";

const navigationRef = createNavigationContainerRef<RootStackParamList>();
const APP_BG = "#F8FAFC";

let splashPreventCalled = false;

async function ensureSplashPrevented(): Promise<void> {
  if (splashPreventCalled) return;
  splashPreventCalled = true;

  try {
    await SplashScreen.preventAutoHideAsync();
  } catch {
    // ignore duplicate / unavailable splash errors
  }
}

void ensureSplashPrevented();

function getActiveRouteName(
  state: NavigationState | PartialState<NavigationState> | undefined,
): string | null {
  if (!state || !state.routes || state.routes.length === 0) {
    return null;
  }

  const route = state.routes[state.index ?? 0];
  const nestedState =
    "state" in route
      ? ((route.state as
          | NavigationState
          | PartialState<NavigationState>
          | undefined) ?? undefined)
      : undefined;

  if (nestedState) {
    return getActiveRouteName(nestedState) ?? route.name;
  }

  return route.name;
}

function trackNavigation(routeName: string | null) {
  if (!routeName || !__DEV__) return;
  console.log("[nav]", routeName);
}

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["awojobs://", "https://awojobs.app"],
  config: {
    screens: {
      App: {
        screens: {
          Jobs: {
            screens: {
              Feed: "",
              JobDetail: "job/:jobId",
            },
          },
        },
      },
      AuthModal: {
        screens: {
          VerifyOtp: "auth/otp",
        },
      },
      Premium: "premium",
      PremiumPayment: "premium/payment",
    },
  },
};

type RootErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string | null;
  resetKey: number;
};

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  RootErrorBoundaryState
> {
  state: RootErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
    resetKey: 0,
  };

  static getDerivedStateFromError(
    error: unknown,
  ): Pick<RootErrorBoundaryState, "hasError" | "errorMessage"> {
    return {
      hasError: true,
      errorMessage:
        error instanceof Error ? error.message : "Unexpected application error",
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error("[root_error_boundary]", error, errorInfo);
  }

  private handleReset = () => {
    this.setState((prev) => ({
      hasError: false,
      errorMessage: null,
      resetKey: prev.resetKey + 1,
    }));
  };

  render() {
    if (!this.state.hasError) {
      return (
        <React.Fragment key={this.state.resetKey}>
          {this.props.children}
        </React.Fragment>
      );
    }

    return (
      <View style={styles.errorRoot}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorBody}>
            The app hit an unexpected error and could not continue normally.
          </Text>

          {this.state.errorMessage ? (
            <Text style={styles.errorDetail}>{this.state.errorMessage}</Text>
          ) : null}

          <Pressable onPress={this.handleReset} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const NATIVE_SPLASH_FAILSAFE_MS = 4000;
const MIN_LAUNCH_SCREEN_MS = 1250;

function AppBootstrap() {
  const { loading: sessionLoading } = useSession();

  const [nativeSplashHidden, setNativeSplashHidden] = useState(false);
  const [launchVisualReady, setLaunchVisualReady] = useState(false);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [navigationReady, setNavigationReady] = useState(false);

  const hideCalledRef = useRef(false);
  const isMountedRef = useRef(true);
  const routeNameRef = useRef<string | null>(null);

  const bootReady = !sessionLoading;

  const showLaunchOverlay =
    !nativeSplashHidden ||
    !launchVisualReady ||
    !minDelayDone ||
    !bootReady ||
    !navigationReady;

  const hideNativeSplash = useCallback(async () => {
    if (hideCalledRef.current) return;
    hideCalledRef.current = true;

    try {
      await SplashScreen.hideAsync();
    } catch {
      // already hidden or unavailable
    } finally {
      if (isMountedRef.current) {
        setNativeSplashHidden(true);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinDelayDone(true);
    }, MIN_LAUNCH_SCREEN_MS);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!nativeSplashHidden) {
        void hideNativeSplash();
      }
    }, NATIVE_SPLASH_FAILSAFE_MS);

    return () => clearTimeout(timer);
  }, [nativeSplashHidden, hideNativeSplash]);

  return (
    <View style={styles.root}>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        onReady={() => {
          setNavigationReady(true);

          const routeName = getActiveRouteName(navigationRef.getRootState());
          routeNameRef.current = routeName;
          trackNavigation(routeName);
        }}
        onStateChange={() => {
          const nextRouteName = getActiveRouteName(
            navigationRef.getRootState(),
          );

          if (routeNameRef.current === nextRouteName) return;
          routeNameRef.current = nextRouteName;
          trackNavigation(nextRouteName);
        }}
        fallback={<View style={styles.fallback} />}
      >
        <RootNavigator />
      </NavigationContainer>

      {showLaunchOverlay ? (
        <View style={styles.launchOverlay} pointerEvents="auto">
          <LaunchScreen
            onReady={() => {
              setLaunchVisualReady(true);

              if (!nativeSplashHidden) {
                void hideNativeSplash();
              }
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootErrorBoundary>
            <AppBootstrap />
          </RootErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: APP_BG,
  },
  fallback: {
    flex: 1,
    backgroundColor: APP_BG,
  },
  launchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: APP_BG,
  },
  errorRoot: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: APP_BG,
  },
  errorCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: "#111827",
    gap: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  errorBody: {
    fontSize: 14,
    lineHeight: 20,
    color: "#D1D5DB",
  },
  errorDetail: {
    fontSize: 12,
    lineHeight: 18,
    color: "#9CA3AF",
  },
  errorButton: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },
  errorButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
