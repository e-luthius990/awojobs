import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MyJobsScreen from "../screens/job/MyJobsScreen";
import JobDetailScreen from "../screens/job/JobDetailScreen";
import { RequireEmployer } from "../guards/RequireEmployer";

export type MyJobsStackParamList = {
  MyJobs: undefined;
  JobDetail: { jobId: string };
};

const Stack = createNativeStackNavigator<MyJobsStackParamList>();

export function MyJobsNavigator() {
  return (
    <RequireEmployer>
      <Stack.Navigator>
        <Stack.Screen
          name="MyJobs"
          component={MyJobsScreen}
          options={{ title: "My Jobs" }}
        />

        <Stack.Screen
          name="JobDetail"
          component={JobDetailScreen}
          options={{ title: "Job Details" }}
        />
      </Stack.Navigator>
    </RequireEmployer>
  );
}
