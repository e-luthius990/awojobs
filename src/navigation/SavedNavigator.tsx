// src/navigation/SavedNavigator.ts

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";

import SavedJobsScreen from "../screens/saved/SavedJobsScreen";

export type SavedStackParamList = {
  SavedJobs: undefined;
};

const Stack = createNativeStackNavigator<SavedStackParamList>();

export function SavedNavigator() {
  const screenOptions = useMemo(
    () => ({
      headerBackTitleVisible: false,
      animation: "fade",
      animationDuration: 180,
    }),
    [],
  );

  return (
    <Stack.Navigator screenOptions={screenOptions} detachInactiveScreens>
      <Stack.Screen
        name="SavedJobs"
        component={SavedJobsScreen}
        options={{ title: "Saved jobs" }}
      />
    </Stack.Navigator>
  );
}
