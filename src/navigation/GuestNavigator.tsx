import React, { useCallback, useMemo } from "react";
import { Platform, type ViewStyle } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  useNavigation,
  type CompositeNavigationProp,
} from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { FeedNavigator } from "./FeedNavigator";
import type { RootStackParamList } from "./RootNavigator";
import { useTheme } from "../theme/useTheme";
import MyAccountGuestScreen from "../screens/settings/MyAccountGuestScreen";

export type GuestTabParamList = {
  Jobs: undefined;
  PostJob: undefined;
  MyAccount: undefined;
};

type GuestNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<GuestTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

const Tab = createBottomTabNavigator<GuestTabParamList>();

function EmptyScreen() {
  return null;
}

export function GuestNavigator() {
  const { theme } = useTheme();
  const navigation = useNavigation<GuestNavigationProp>();

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

  const openEmployerLogin = useCallback(() => {
    navigation.navigate("AuthModal", {
      screen: "Login",
      params: {
        forcedRole: "employer",
        intent: "post_job",
      },
    });
  }, [navigation]);

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
            case "MyAccount":
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
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            openEmployerLogin();
          },
        }}
      />

      <Tab.Screen
        name="MyAccount"
        component={MyAccountGuestScreen}
        options={{
          title: "My Account",
          tabBarLabel: "Account",
        }}
      />
    </Tab.Navigator>
  );
}
