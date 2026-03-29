// src/navigation/AuthNavigator.tsx

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResetCodeScreen from "../screens/auth/ResetCodeScreen";
import VerifyOtpScreen from "../screens/auth/VerifyOtpScreen";

export type AuthRole = "employer" | "job_seeker";
export type AuthIntent = "premium_upgrade" | "post_job";

export type LoginRouteParams = {
  role?: AuthRole;
  forcedRole?: AuthRole;
  intent?: AuthIntent;
};

export type RegisterRouteParams = {
  role?: AuthRole;
  forcedRole?: AuthRole;
  intent?: AuthIntent;
};

export type VerifyOtpRouteParams = {
  phone: string;
  password: string;
  role: AuthRole;
  intent?: AuthIntent;
};

export type AuthStackParamList = {
  Login: LoginRouteParams | undefined;
  Register: RegisterRouteParams | undefined;
  VerifyOtp: VerifyOtpRouteParams;
  ForgotPassword: undefined;
  ResetCode: { phone: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          animation: "fade",
        }}
      />

      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          animation: "slide_from_right",
        }}
      />

      <Stack.Screen
        name="VerifyOtp"
        component={VerifyOtpScreen}
        options={{
          animation: "slide_from_right",
          gestureEnabled: false,
        }}
      />

      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          animation: "slide_from_right",
        }}
      />

      <Stack.Screen
        name="ResetCode"
        component={ResetCodeScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
    </Stack.Navigator>
  );
}
