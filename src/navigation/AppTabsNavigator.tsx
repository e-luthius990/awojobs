import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { FeedNavigator } from "./FeedNavigator";
import { PostJobNavigator } from "./PostJobNavigator";
import { SettingsNavigator } from "./SettingsNavigator";

const Tab = createBottomTabNavigator();

export function AppTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === "FeedTab") {
            iconName = focused ? "briefcase" : "briefcase-outline";
          }

          if (route.name === "PostTab") {
            iconName = focused ? "add-circle" : "add-circle-outline";
          }

          if (route.name === "SettingsTab") {
            iconName = focused ? "settings" : "settings-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#111",
        tabBarInactiveTintColor: "#888",
      })}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedNavigator}
        options={{ title: "Jobs" }}
      />

      <Tab.Screen
        name="PostTab"
        component={PostJobNavigator}
        options={{ title: "Post Job +" }}
      />

      <Tab.Screen
        name="SettingsTab"
        component={SettingsNavigator}
        options={{ title: "Settings" }}
      />
    </Tab.Navigator>
  );
}
