import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AdminPostJobScreen from "../screens/admin/AdminPostJobScreen";
import AdminSeedJobsScreen from "../screens/admin/AdminSeedJobsScreen";

export type AdminPostStackParamList = {
  PostJob: undefined;
  SeedJobs: undefined;
};

const Stack = createNativeStackNavigator<AdminPostStackParamList>();

export default function AdminPostNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="PostJob"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="PostJob"
        component={AdminPostJobScreen}
        options={{
          animation: "fade",
        }}
      />

      <Stack.Screen
        name="SeedJobs"
        component={AdminSeedJobsScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
    </Stack.Navigator>
  );
}
