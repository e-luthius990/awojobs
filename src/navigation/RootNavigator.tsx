import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator } from "react-native";

import { AppTabsNavigator } from "./AppTabsNavigator";
import { AuthNavigator } from "./AuthNavigator";
import { useSession } from "../state/useSession";

// 👇 ADD THIS IMPORT
import ManualLocationScreen from "../screens/location/ManualLocationScreen";

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { loading } = useSession();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main app */}
      <Stack.Screen name="App" component={AppTabsNavigator} />

      {/* Auth (modal) */}
      <Stack.Screen
        name="Auth"
        component={AuthNavigator}
        options={{ presentation: "modal" }}
      />

      {/* ✅ LOCATION FLOW (GLOBAL) */}
      <Stack.Screen
        name="ManualLocation"
        component={ManualLocationScreen}
        options={{ presentation: "card" }}
      />
    </Stack.Navigator>
  );
}
