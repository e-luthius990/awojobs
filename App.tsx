// MUST be the first import (Android requirement)
import "react-native-gesture-handler";

import { useEffect, useState } from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";

import { RootNavigator } from "./src/navigation/RootNavigator";
import { AnimatedSplash } from "./src/ui/splash/AnimatedSplash";

/* --------------------------------------------------
   KEEP SPLASH VISIBLE (CONTROLLED HANDOFF)
--------------------------------------------------- */
SplashScreen.preventAutoHideAsync();

/* --------------------------------------------------
   DEEP LINK CONFIG (AwoJobs)
--------------------------------------------------- */
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
      Auth: {
        screens: {
          OTP: "auth/otp",
        },
      },
    },
  },
};

export default function App() {
  const [ready, setReady] = useState(false);

  /* --------------------------------------------------
     APP BOOTSTRAP
  --------------------------------------------------- */
  useEffect(() => {
    // If later you load fonts / cache → do it here
  }, []);

  /* --------------------------------------------------
     SPLASH → APP HANDOFF
  --------------------------------------------------- */
  if (!ready) {
    return <AnimatedSplash onFinish={() => setReady(true)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer linking={linking}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
