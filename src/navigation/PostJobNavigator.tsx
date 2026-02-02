import { createNativeStackNavigator } from "@react-navigation/native-stack";

import PostJobScreen from "../screens/post/PostJobScreen";
import JobPreviewScreen from "../screens/post/JobPreviewScreen";
import { RequireEmployer } from "../guards/RequireEmployer";

export type PostJobStackParamList = {
  PostJob: undefined;
  Preview: {
    job: {
      title: string;
      description?: string;
      pay_type: "daily" | "weekly" | "monthly";
      contact_method: "call" | "whatsapp" | "walk_in";
      contact_phone: string;
      expires_at: string;
      location_id: string;
      locationName?: string;
    };
  };
};

const Stack = createNativeStackNavigator<PostJobStackParamList>();

export function PostJobNavigator() {
  return (
    <RequireEmployer>
      <Stack.Navigator>
        <Stack.Screen
          name="PostJob"
          component={PostJobScreen}
          options={{
            title: "Post Job",
            headerBackTitleVisible: false,
          }}
        />

        <Stack.Screen
          name="Preview"
          component={JobPreviewScreen}
          options={{
            title: "Preview Job",
            presentation: "card",
            headerBackTitleVisible: false,
          }}
        />
      </Stack.Navigator>
    </RequireEmployer>
  );
}
