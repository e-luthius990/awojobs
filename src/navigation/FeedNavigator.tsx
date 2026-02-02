import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FeedScreen from "../screens/feed/FeedScreen";
import JobDetailScreen from "../screens/feed/JobDetailScreen";
import { Job } from "../jobs/jobs.types";

export type FeedStackParamList = {
  Feed: undefined;
  JobDetail: { job: Job };
};

const Stack = createNativeStackNavigator<FeedStackParamList>();

export function FeedNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Feed"
        component={FeedScreen}
        options={{ title: "Jobs Near You" }}
      />
      <Stack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{ title: "Job Details" }}
      />
    </Stack.Navigator>
  );
}
