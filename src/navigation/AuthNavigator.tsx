// src/navigation/AuthNavigator.tsx

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResetCodeScreen from "../screens/auth/ResetCodeScreen";

export type AuthStackParamList = {
  Login: undefined;
  Register: { role?: "employer" | "job_seeker" } | undefined;
  ForgotPassword: undefined;
  ResetCode: { phone: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      animation: "slide_from_right",
      animationDuration: 200,
      gestureEnabled: true,
    }),
    [],
  );

  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={screenOptions}
      detachInactiveScreens
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetCode" component={ResetCodeScreen} />
    </Stack.Navigator>
  );
}
