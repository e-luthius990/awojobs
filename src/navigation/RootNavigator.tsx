// src/navigation/RootNavigator.tsx

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, StyleSheet } from "react-native";
import { useEffect, useRef } from "react";

import { AppTabsNavigator } from "./AppTabsNavigator";
import { AuthNavigator } from "./AuthNavigator";
import ManualLocationScreen from "../screens/location/ManualLocationScreen";
import PremiumScreen from "../screens/premium/PremiumScreen";

import { useSession } from "../state/useSession";
import { useProfile } from "../state/useProfile";
import { consumePendingIntent } from "../intent/intent.store";

export type RootStackParamList = {
  App: undefined;
  ManualLocation: undefined;
  AuthModal: undefined;
  Premium: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function SplashScreen() {
  return <View style={styles.splash} />;
}

export function RootNavigator() {
  const { session, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;

  const { profile, loading: profileLoading } = useProfile(
    session ? userId : null,
  );

  const isHydrating = sessionLoading || (session !== null && profileLoading);

  const intentHandledRef = useRef(false);

  /* =====================================================
     INTENT RESUME SYSTEM
  ===================================================== */

  useEffect(() => {
    if (!session || !profile) return;
    if (intentHandledRef.current) return;

    const intent = consumePendingIntent();
    if (!intent) return;

    intentHandledRef.current = true;

    // Delay to avoid navigation race
    setTimeout(() => {
      switch (intent.intent) {
        case "premium":
          // Open premium modal after registration
          // (user just registered)
          break;

        case "post_job":
          // Employers auto land on employer navigator
          // No need to navigate manually
          break;

        case "saved_jobs":
          // Tabs handle this automatically
          break;

        default:
          break;
      }
    }, 50);
  }, [session, profile]);

  if (isHydrating) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    >
      <Stack.Screen name="App">
        {(props) => (
          <AppTabsNavigator {...props} session={session} profile={profile} />
        )}
      </Stack.Screen>

      <Stack.Screen name="ManualLocation" component={ManualLocationScreen} />

      <Stack.Screen
        name="Premium"
        component={PremiumScreen}
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />

      <Stack.Screen
        name="AuthModal"
        component={AuthNavigator}
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
});
