// src/navigation/EmployerNavigator.tsx

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";

import EmployerDashboardScreen from "../screens/employer/EmployerDashboardScreen";
import ApplicationsInboxScreen from "../screens/employer/ApplicationsInboxScreen";
import EmployerInsightsScreen from "../screens/employer/EmployerInsightsScreen";
import SponsoredInsightsScreen from "../screens/employer/SponsoredInsightsScreen";
import EmployerTrustScreen from "../screens/employer/EmployerTrustScreen";
import JobDetailScreen from "../screens/feed/JobDetailScreen";
import MyJobsScreen from "../screens/job/MyJobsScreen";
import { PostJobNavigator } from "./PostJobNavigator";

import { RequireEmployer } from "../guards/RequireEmployer";

const Stack = createNativeStackNavigator();

/**
 * Internal stack (mounted ONLY after auth passes)
 */
function EmployerStack() {
  const screenOptions = useMemo(
    () => ({
      animation: "slide_from_right",
      animationDuration: 180,
      headerBackTitleVisible: false,
    }),
    [],
  );

  return (
    <Stack.Navigator screenOptions={screenOptions} detachInactiveScreens>
      <Stack.Screen
        name="EmployerDashboard"
        component={EmployerDashboardScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="MyJobs"
        component={MyJobsScreen}
        options={{ title: "My Jobs" }}
      />

      <Stack.Screen
        name="ApplicationsInbox"
        component={ApplicationsInboxScreen}
        options={{ title: "Applications" }}
      />

      <Stack.Screen
        name="EmployerInsights"
        component={EmployerInsightsScreen}
        options={{ title: "Insights" }}
      />

      <Stack.Screen
        name="SponsoredInsights"
        component={SponsoredInsightsScreen}
        options={{ title: "Sponsored Performance" }}
      />

      <Stack.Screen
        name="EmployerTrust"
        component={EmployerTrustScreen}
        options={{ title: "Trust & Risk" }}
      />

      <Stack.Screen
        name="PostJobFlow"
        component={PostJobNavigator}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{ title: "Job Details" }}
      />
    </Stack.Navigator>
  );
}

/**
 * Guard wrapper
 */
export function EmployerNavigator() {
  return (
    <RequireEmployer>
      <EmployerStack />
    </RequireEmployer>
  );
}
