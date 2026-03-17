import React, { useMemo } from "react";
import { Platform, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import ModeratorDashboard from "../screens/moderator/ModeratorDashboard";
import ReportedJobsScreen from "../screens/moderator/ReportedJobsScreen";
import ModeratorUsersScreen from "../screens/moderator/ModeratorUsersScreen";
import { RequireModerator } from "../guards/RoleGuard";
import { useTheme } from "../theme/useTheme";

export type ModeratorTabsParamList = {
  Dashboard: undefined;
  ReportedJobs: undefined;
  Users: undefined;
};

const Tab = createBottomTabNavigator<ModeratorTabsParamList>();

export default function ModeratorNavigator() {
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
    <RequireModerator>
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
                iconName = focused ? "speedometer" : "speedometer-outline";
                break;
              case "ReportedJobs":
                iconName = focused ? "alert-circle" : "alert-circle-outline";
                break;
              case "Users":
                iconName = focused ? "people" : "people-outline";
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
          component={ModeratorDashboard}
          options={{ tabBarLabel: "Home" }}
        />

        <Tab.Screen
          name="ReportedJobs"
          component={ReportedJobsScreen}
          options={{ tabBarLabel: "Reports" }}
        />

        <Tab.Screen
          name="Users"
          component={ModeratorUsersScreen}
          options={{ tabBarLabel: "Users" }}
        />
      </Tab.Navigator>
    </RequireModerator>
  );
}
