import { createNativeStackNavigator } from "@react-navigation/native-stack";

import WelcomeScreen from "../screens/auth/WelcomeScreen";
import OTPScreen from "../screens/auth/OTPScreen";
import PinLoginScreen from "../screens/auth/PinLoginScreen";
import CreatePinScreen from "../screens/auth/CreatePinScreen";

const Stack = createNativeStackNavigator();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "fade", // low-end friendly
      }}
    >
      {/* Entry point for employers */}
      <Stack.Screen name="Welcome" component={WelcomeScreen} />

      {/* Returning employer with PIN */}
      <Stack.Screen name="PinLogin" component={PinLoginScreen} />

      {/* OTP verification (first time / fallback) */}
      <Stack.Screen name="OTP" component={OTPScreen} />

      {/* First-time PIN creation */}
      <Stack.Screen name="CreatePin" component={CreatePinScreen} />
    </Stack.Navigator>
  );
}
