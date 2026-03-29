// src/navigation/PostJobNavigator.ts

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import PostJobScreen from "../screens/post/PostJobScreen";
import JobPreviewScreen from "../screens/post/JobPreviewScreen";
import PaymentScreen from "../screens/payment/PaymentScreen";
import PaymentPendingScreen from "../screens/payment/PaymentPendingScreen";
import SponsorPaymentScreen from "../screens/payment/SponsorPaymentScreen";
import PostingSuccessScreen from "../screens/post/PostingSuccessScreen";
import type { Job } from "../jobs/jobs.types";

export type PostJobMode = "create" | "edit" | "renew";
export type PaymentMode = "create" | "renew";

export type PostJobStackParamList = {
  PostJob:
    | {
        job?: Job;
        jobId?: string;
        mode?: PostJobMode;
      }
    | undefined;

  Preview: {
    draftId: string;
    isEdit: boolean;
  };

  Payment: {
    draftId: string;
    mode?: PaymentMode;
    jobId?: string;
  };

  SponsorPayment: {
    jobId: string;
  };

  PaymentPending: {
    intentId: string;
    jobId?: string;
    flow?: "job_post" | "sponsor_upgrade";
  };

  PostingSuccess: undefined;
};

const Stack = createNativeStackNavigator<PostJobStackParamList>();

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

      <Stack.Screen
        name="PostingSuccess"
        component={PostingSuccessScreen}
        options={{
          animation: "fade_from_bottom",
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}
