import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NavigatorScreenParams } from "@react-navigation/native";

import { AppTabsNavigator } from "./AppTabsNavigator";
import { AuthNavigator } from "./AuthNavigator";
import type { AuthStackParamList } from "./AuthNavigator";
import PremiumScreen from "../screens/premium/PremiumScreen";
import PremiumPaymentScreen from "../screens/premium/PremiumPaymentScreen";

import { useSession } from "../state/useSession";
import { useProfile } from "../state/useProfile";
import { useTheme } from "../theme/useTheme";

export type RootStackParamList = {
  App: undefined;
  AuthModal: NavigatorScreenParams<AuthStackParamList>;
  Premium: undefined;
  PremiumPayment: {
    purpose: "premium_1_day" | "premium_7_days" | "premium_30_days";
    planLabel: string;
    amount: number;
    intentId?: string | null;
    paymentReference?: string | null;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { theme } = useTheme();

  const {
    session,
    loading: sessionLoading,
    errorCode: sessionErrorCode,
  } = useSession();

  const userId = session?.user?.id ?? null;

  const {
    profile,
    isSuspended,
    loading: profileLoading,
    errorCode: profileErrorCode,
  } = useProfile(userId);

  const authBootstrapping = sessionLoading || (!!session && profileLoading);

  return (
    <Stack.Navigator
      initialRouteName="App"
      screenOptions={{
        headerShown: false,
        animation: "default",
        contentStyle: { backgroundColor: theme.colors.bgApp },
      }}
    >
      <Stack.Screen name="App">
        {(props) => (
          <AppTabsNavigator
            {...props}
            session={session}
            sessionLoading={sessionLoading}
            sessionErrorCode={sessionErrorCode}
            profile={profile}
            profileLoading={profileLoading}
            profileErrorCode={profileErrorCode}
            bootstrapping={authBootstrapping}
            isSuspended={isSuspended}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="AuthModal"
        component={AuthNavigator}
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />

      <Stack.Screen
        name="Premium"
        component={PremiumScreen}
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />

      <Stack.Screen
        name="PremiumPayment"
        component={PremiumPaymentScreen}
        options={{
          presentation: "card",
          animation: "slide_from_right",
        }}
      />
    </Stack.Navigator>
  );
}
