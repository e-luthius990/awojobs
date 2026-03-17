import React, { useMemo } from "react";
import { Platform, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { RoleGuard } from "../guards/RoleGuard";

import AdminDashboard from "../screens/admin/AdminDashboard";
import AdminJobsScreen from "../screens/admin/AdminJobsScreen";
import AdminPaymentsScreen from "../screens/admin/AdminPaymentsOverviewScreen";
import AdminUsersScreen from "../screens/admin/AdminUsersScreen";
import AdminAnalyticsScreen from "../screens/admin/AdminAnalyticsScreen";

import AdminPostNavigator from "./AdminPostNavigator";
import { useTheme } from "../theme/useTheme";

type SuperAdminTabsParamList = {
  Dashboard: undefined;
  Jobs: undefined;
  Post: undefined;
  Payments: undefined;
  Users: undefined;
  Analytics: undefined;
};

const Tab = createBottomTabNavigator<SuperAdminTabsParamList>();

export function SuperAdminNavigator() {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        tabBar: {
          backgroundColor: theme.colors.bgSurfaceElevated,
          borderTopColor: theme.colors.borderDefault,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 84 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 20 : 10,
          ...theme.shadows.level2,
        },
      }),
    [theme],
  );

  return (
    <RoleGuard allowed={["super_admin"]}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          lazy: true,
          freezeOnBlur: true,

          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textTertiary,

          tabBarStyle: styles.tabBar,
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
              case "Dashboard":
                iconName = focused ? "grid" : "grid-outline";
                break;
              case "Jobs":
                iconName = focused ? "briefcase" : "briefcase-outline";
                break;
              case "Post":
                iconName = focused ? "add-circle" : "add-circle-outline";
                break;
              case "Payments":
                iconName = focused ? "card" : "card-outline";
                break;
              case "Users":
                iconName = focused ? "people" : "people-outline";
                break;
              case "Analytics":
                iconName = focused ? "bar-chart" : "bar-chart-outline";
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
          name="Dashboard"
          component={AdminDashboard}
          options={{ tabBarLabel: "Home" }}
        />

        <Tab.Screen
          name="Jobs"
          component={AdminJobsScreen}
          options={{ tabBarLabel: "Jobs" }}
        />

        <Tab.Screen
          name="Post"
          component={AdminPostNavigator}
          options={{ title: "Post", tabBarLabel: "Post" }}
        />

        <Tab.Screen
          name="Payments"
          component={AdminPaymentsScreen}
          options={{ tabBarLabel: "Payments" }}
        />

        <Tab.Screen
          name="Users"
          component={AdminUsersScreen}
          options={{ tabBarLabel: "Users" }}
        />

        <Tab.Screen
          name="Analytics"
          component={AdminAnalyticsScreen}
          options={{ tabBarLabel: "Analytics" }}
        />
      </Tab.Navigator>
    </RoleGuard>
  );
}
