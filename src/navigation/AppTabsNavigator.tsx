import React, { useMemo } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet } from "react-native";

import { FeedNavigator } from "./FeedNavigator";
import { SettingsNavigator } from "./SettingsNavigator";
import { AuthNavigator } from "./AuthNavigator";
import { EmployerNavigator } from "./EmployerNavigator";
import SavedJobsScreen from "../screens/job/SavedJobsScreen";

import { useSavedCount } from "../state/useSavedCount";

type Props = {
  session: any;
  profile: any;
};

const Tab = createBottomTabNavigator();

const COLORS = {
  bg: "#FFFFFF",
  border: "#E5E7EB",
  muted: "#94A3B8",
  text: "#111827",
  primary: "#2563EB",
};

export function AppTabsNavigator({ session, profile }: Props) {
  const savedCount = useSavedCount();

  const isAuthenticated = !!session;
  const role = profile?.role ?? null;

  const isEmployer = role === "employer";
  const isJobSeeker = role === "job_seeker";

  /* =====================================================
     POST TAB RESOLUTION
  ===================================================== */

  const PostComponent = useMemo(() => {
    if (isEmployer) {
      return EmployerNavigator;
    }

    // Guest → Login
    if (!isAuthenticated) {
      return AuthNavigator;
    }

    // JobSeeker → cannot post jobs
    return AuthNavigator;
  }, [isEmployer, isAuthenticated]);

  const savedBadge = useMemo(() => {
    if (!isAuthenticated) return undefined;
    if (!savedCount || savedCount <= 0) return undefined;
    return savedCount;
  }, [isAuthenticated, savedCount]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.item,
        tabBarLabelStyle: styles.label,
        tabBarIconStyle: styles.iconStyle,
        tabBarActiveTintColor: COLORS.text,
        tabBarInactiveTintColor: COLORS.muted,
      }}
    >
      {/* ================= FEED ================= */}
      <Tab.Screen
        name="FeedTab"
        component={FeedNavigator}
        options={{
          title: "Jobs",
          tabBarIcon: ({ focused }) => (
            <View style={styles.iconSlot}>
              <View style={[styles.pill, focused && styles.pillActive]}>
                <Ionicons
                  name={focused ? "briefcase" : "briefcase-outline"}
                  size={22}
                  color={focused ? "#FFFFFF" : COLORS.muted}
                />
              </View>
            </View>
          ),
        }}
      />

      {/* ================= SAVED ================= */}
      {isAuthenticated && isJobSeeker && (
        <Tab.Screen
          name="SavedTab"
          component={SavedJobsScreen}
          options={{
            title: "Saved",
            tabBarBadge: savedBadge,
            tabBarIcon: ({ focused }) => (
              <View style={styles.iconSlot}>
                <View style={[styles.pill, focused && styles.pillActive]}>
                  <Ionicons
                    name={focused ? "star" : "star-outline"}
                    size={22}
                    color={focused ? "#FFFFFF" : COLORS.muted}
                  />
                </View>
              </View>
            ),
          }}
        />
      )}

      {/* ================= POST ================= */}
      <Tab.Screen
        name="PostJobTab"
        component={PostComponent}
        options={{
          title: "Post",
          tabBarIcon: () => (
            <View style={styles.iconSlot}>
              <View style={styles.postWrap}>
                <View style={styles.postButton}>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </View>
              </View>
            </View>
          ),
        }}
      />

      {/* ================= SETTINGS ================= */}
      {isAuthenticated && (
        <Tab.Screen
          name="SettingsTab"
          component={SettingsNavigator}
          options={{
            title: "Settings",
            tabBarIcon: ({ focused }) => (
              <View style={styles.iconSlot}>
                <View style={[styles.pill, focused && styles.pillActive]}>
                  <Ionicons
                    name={focused ? "settings" : "settings-outline"}
                    size={22}
                    color={focused ? "#FFFFFF" : COLORS.muted}
                  />
                </View>
              </View>
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 85,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
  },
  item: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 2,
  },
  iconStyle: {
    marginTop: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10,
  },
  iconSlot: {
    height: 44,
    width: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  pillActive: {
    backgroundColor: COLORS.primary,
  },
  postWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  postButton: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
