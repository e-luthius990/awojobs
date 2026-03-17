import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SavedJobsScreen from "../screens/job/SavedJobsScreen";
import JobDetailScreen from "../screens/feed/JobDetailScreen";
import type { Job } from "../jobs/jobs.types";

export type SavedStackParamList = {
  SavedJobs: undefined;

  JobDetail: {
    jobId: string;
    preview?: Partial<Job>;
  };
};

const Stack = createNativeStackNavigator<SavedStackParamList>();

export function SavedNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="SavedJobs"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="SavedJobs"
        component={SavedJobsScreen}
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
