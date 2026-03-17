import { createNativeStackNavigator } from "@react-navigation/native-stack";

import FeedScreen from "../screens/feed/FeedScreen";
import JobDetailScreen from "../screens/feed/JobDetailScreen";
import type { Job } from "../jobs/jobs.types";

export type FeedStackParamList = {
  Feed: undefined;
  JobDetail: {
    jobId: string;
    preview?: Partial<Job>;
  };
};

const Stack = createNativeStackNavigator<FeedStackParamList>();

export function FeedNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Feed"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          animation: "fade",
        }}
      />

      <Stack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
    </Stack.Navigator>
  );
}
