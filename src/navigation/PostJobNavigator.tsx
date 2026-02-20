// src/navigation/PostJobNavigator.ts

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";

import PostJobScreen from "../screens/post/PostJobScreen";
import JobPreviewScreen from "../screens/post/JobPreviewScreen";
import PaymentScreen from "../screens/payment/PaymentScreen";
import PaymentPendingScreen from "../screens/payment/PaymentPendingScreen";

export type PostJobStackParamList = {
  PostJob: undefined;

  Preview: {
    draftId: string; // local draft reference (NOT full object)
    isEdit: boolean;
  };

  Payment: {
    draftId: string;
    mode?: "create" | "renew";
    jobId?: string;
  };

  PaymentPending: {
    jobId: string;
  };
};

const Stack = createNativeStackNavigator<PostJobStackParamList>();

export function PostJobNavigator() {
  const screenOptions = useMemo(
    () => ({
      headerBackTitleVisible: false,
      animation: "slide_from_right",
      animationDuration: 200,
    }),
    [],
  );

  return (
    <Stack.Navigator
      initialRouteName="PostJob"
      screenOptions={screenOptions}
      detachInactiveScreens
    >
      {/* 📝 CREATE JOB */}
      <Stack.Screen
        name="PostJob"
        component={PostJobScreen}
        options={{ title: "Post Job" }}
      />

      {/* 👀 PREVIEW */}
      <Stack.Screen
        name="Preview"
        component={JobPreviewScreen}
        options={{ title: "Preview Job" }}
      />

      {/* 💳 PAYMENT */}
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ title: "Payment" }}
      />

      {/* ⏳ PAYMENT PENDING */}
      <Stack.Screen
        name="PaymentPending"
        component={PaymentPendingScreen}
        options={{
          title: "Processing payment",
          gestureEnabled: false,
          headerBackVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}
