import React, { useMemo } from "react";
import { Platform, type ViewStyle } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import EmployerDashboardScreen from "../screens/employer/EmployerDashboardScreen";
import MyJobsScreen from "../screens/job/MyJobsScreen";
import PaymentsHistoryScreen from "../screens/payment/PaymentsHistoryScreen";
import EmployerProfileScreen from "../screens/employer/EmployerProfileScreen";
import { useTheme } from "../theme/useTheme";

export type EmployerTabsParamList = {
  Home: undefined;
  MyJobs: undefined;
  Payments: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<EmployerTabsParamList>();

export function EmployerTabs() {
  const { theme } = useTheme();

  const tabBarStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: theme.colors.bgSurfaceElevated,
      borderTopColor: theme.colors.borderDefault,
      borderTopWidth: 1,
      height: Platform.OS === "ios" ? 84 : 68,
      paddingTop: 8,
      paddingBottom: Platform.OS === "ios" ? 20 : 10,
      ...theme.shadows.level2,
    }),
    [
      theme.colors.bgSurfaceElevated,
      theme.colors.borderDefault,
      theme.shadows.level2,
    ],
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case "Home":
              iconName = focused ? "home" : "home-outline";
              break;
            case "MyJobs":
              iconName = focused ? "briefcase" : "briefcase-outline";
              break;
            case "Payments":
              iconName = focused ? "card" : "card-outline";
              break;
            case "Profile":
              iconName = focused ? "person" : "person-outline";
              break;
            default:
              iconName = "ellipse";
          }

          return (
            <Ionicons
              name={iconName}
              size={focused ? size + 1 : size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={EmployerDashboardScreen}
        options={{ tabBarLabel: "Home" }}
      />

      <Tab.Screen
        name="MyJobs"
        component={MyJobsScreen}
        options={{ tabBarLabel: "My Jobs" }}
      />

      <Tab.Screen
        name="Payments"
        component={PaymentsHistoryScreen}
        options={{ tabBarLabel: "Payments" }}
      />

      <Tab.Screen
        name="Profile"
        component={EmployerProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}
