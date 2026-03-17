// src/navigation/PostJobNavigator.ts

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import PostJobScreen from "../screens/post/PostJobScreen";
import JobPreviewScreen from "../screens/post/JobPreviewScreen";
import PaymentScreen from "../screens/payment/PaymentScreen";
import PaymentPendingScreen from "../screens/payment/PaymentPendingScreen";
import SponsorPaymentScreen from "../screens/payment/SponsorPaymentScreen";

/* =====================================================
   STACK PARAM TYPES
===================================================== */

export type PostJobStackParamList = {
  PostJob: undefined;

  Preview: {
    draftId: string;
    isEdit: boolean;
  };

  Payment: {
    draftId: string;
    mode?: "create" | "renew";
    jobId?: string;
  };

  SponsorPayment: {
    jobId: string;
  };

  PaymentPending: {
    jobId: string;
    flow?: "job_post" | "sponsor_upgrade";
    intentId?: string | null;
  };
};

const Stack = createNativeStackNavigator<PostJobStackParamList>();

/* =====================================================
   NAVIGATOR
===================================================== */

export function PostJobNavigator() {
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
        component={PostJobScreen}
        options={{
          animation: "slide_from_right",
        }}
      />

      <Stack.Screen
        name="Preview"
        component={JobPreviewScreen}
        options={{
          animation: "slide_from_right",
        }}
      />

      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{
          animation: "slide_from_right",
        }}
      />

      <Stack.Screen
        name="SponsorPayment"
        component={SponsorPaymentScreen}
        options={{
          animation: "slide_from_right",
        }}
      />

      <Stack.Screen
        name="PaymentPending"
        component={PaymentPendingScreen}
        options={{
          animation: "fade",
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}
