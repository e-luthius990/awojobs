// src/navigation/SettingsNavigator.tsx

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, StyleSheet } from "react-native";
import { useMemo } from "react";

import SettingsScreen from "../screens/settings/SettingsScreen";

import { useSession } from "../state/useSession";
import { useProfile } from "../state/useProfile";

const Stack = createNativeStackNavigator();

export function SettingsNavigator() {
  const { session } = useSession();
  const userId = session?.user?.id ?? null;

  const { profile, loading } = useProfile(userId);

  const role = profile?.role ?? null;

  const allowed = !!session && (role === "employer" || role === "job_seeker");

  if (loading) {
    return <View style={styles.skeleton} />;
  }

  if (!allowed) {
    return <View style={styles.skeleton} />;
  }

  const screenOptions = useMemo(
    () => ({
      headerBackTitleVisible: false,
      animation: "slide_from_right",
      animationDuration: 200,
    }),
    [],
  );

  return (
    <Stack.Navigator screenOptions={screenOptions} detachInactiveScreens>
      <Stack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
});
