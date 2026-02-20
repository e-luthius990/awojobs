// src/navigation/FeedNavigator.ts

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";

import FeedScreen from "../screens/feed/FeedScreen";
import JobDetailScreen from "../screens/feed/JobDetailScreen";
import type { Job } from "../jobs/jobs.types";

export type FeedStackParamList = {
  Feed: undefined;
  JobDetail: {
    jobId: string;
    // Keep optional lightweight preview for instant paint
    preview?: Pick<Job, "title" | "pay_type" | "location_id">;
  };
};

const Stack = createNativeStackNavigator<FeedStackParamList>();

export function FeedNavigator() {
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      animation: "fade", // smoother + lighter than default push
      animationDuration: 180,
    }),
    [],
  );

  return (
    <Stack.Navigator
      initialRouteName="Feed"
      screenOptions={screenOptions}
      detachInactiveScreens
    >
      <Stack.Screen name="Feed" component={FeedScreen} />

      <Stack.Screen name="JobDetail" component={JobDetailScreen} />
    </Stack.Navigator>
  );
}
