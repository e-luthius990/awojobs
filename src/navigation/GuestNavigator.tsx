import React, { useMemo } from "react";
import { Platform, ViewStyle } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { FeedNavigator } from "./FeedNavigator";
import { useTheme } from "../theme/useTheme";

type GuestTabParamList = {
  Jobs: undefined;
  PostJob: undefined;
};

const Tab = createBottomTabNavigator<GuestTabParamList>();

function EmptyScreen() {
  return null;
}

export function GuestNavigator() {
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
            case "PostJob":
              iconName = focused ? "add-circle" : "add-circle-outline";
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
        options={{
          title: "Jobs",
          tabBarLabel: "Jobs",
        }}
      />

      <Tab.Screen
        name="PostJob"
        component={EmptyScreen}
        options={{
          title: "Post Job",
          tabBarLabel: "Post Job",
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();

            navigation.navigate("Jobs");

            const parent = navigation.getParent();
            if (!parent) return;

            parent.navigate("AuthModal", {
              screen: "Login",
              params: {
                forcedRole: "employer",
                intent: "post_job",
              },
            });
          },
        })}
      />
    </Tab.Navigator>
  );
}
