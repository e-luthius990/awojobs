import React, { useMemo } from "react";
import { Platform, type ViewStyle } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { FeedNavigator } from "./FeedNavigator";
import { SavedNavigator } from "./SavedNavigator";
import MyApplicationsScreen from "../screens/applications/MyApplicationsScreen";
import JobSeekerProfileScreen from "../screens/job/JobSeekerProfileScreen";
import { useTheme } from "../theme/useTheme";

export type JobSeekerTabsParamList = {
  Jobs: undefined;
  Saved: undefined;
  Applications: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<JobSeekerTabsParamList>();

export function JobSeekerNavigator() {
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
            case "Jobs":
              iconName = focused ? "briefcase" : "briefcase-outline";
              break;
            case "Saved":
              iconName = focused ? "bookmark" : "bookmark-outline";
              break;
            case "Applications":
              iconName = focused ? "document-text" : "document-text-outline";
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
        name="Jobs"
        component={FeedNavigator}
        options={{ tabBarLabel: "Jobs" }}
      />

      <Tab.Screen
        name="Saved"
        component={SavedNavigator}
        options={{ tabBarLabel: "Saved" }}
      />

      <Tab.Screen
        name="Applications"
        component={MyApplicationsScreen}
        options={{ tabBarLabel: "Applications" }}
      />

      <Tab.Screen
        name="Profile"
        component={JobSeekerProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}
