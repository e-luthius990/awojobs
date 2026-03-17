import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { RoleGuard } from "../guards/RoleGuard";
import { EmployerTabs } from "./EmployerTabs";
import { PostJobNavigator } from "./PostJobNavigator";

import ApplicationsInboxScreen from "../screens/employer/ApplicationsInboxScreen";
import JobDetailScreen from "../screens/feed/JobDetailScreen";
import type { Job } from "../jobs/jobs.types";

export type EmployerRootStackParamList = {
  EmployerTabs: undefined;
  ApplicationsInbox: undefined;
  PostJobFlow: undefined;
  JobDetail: {
    jobId: string;
    preview?: Partial<Job>;
  };
};

const Stack = createNativeStackNavigator<EmployerRootStackParamList>();

export function EmployerNavigator() {
  return (
    <RoleGuard allowed={["employer"]}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
        }}
      >
        <Stack.Screen
          name="EmployerTabs"
          component={EmployerTabs}
          options={{
            animation: "fade",
          }}
        />

        <Stack.Screen
          name="ApplicationsInbox"
          component={ApplicationsInboxScreen}
          options={{
            animation: "slide_from_right",
          }}
        />

        <Stack.Screen
          name="PostJobFlow"
          component={PostJobNavigator}
          options={{
            animation: "slide_from_right",
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
    </RoleGuard>
  );
}
