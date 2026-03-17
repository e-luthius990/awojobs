import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Session } from "@supabase/supabase-js";

import { GuestNavigator } from "./GuestNavigator";
import { JobSeekerNavigator } from "./JobSeekerNavigator";
import { EmployerNavigator } from "./EmployerNavigator";
import ModeratorNavigator from "./ModeratorNavigator";
import { SuperAdminNavigator } from "./SuperAdminNavigator";
import { useTheme } from "../theme/useTheme";
import { UserProfile } from "../types/user";

type Props = {
  session: Session | null;
  profile: UserProfile | null;
};

type AppRole = "job_seeker" | "employer" | "moderator" | "super_admin" | null;

function resolveRole(profile: UserProfile | null): AppRole {
  const value = profile?.role;

  if (
    value === "job_seeker" ||
    value === "employer" ||
    value === "moderator" ||
    value === "super_admin"
  ) {
    return value;
  }

  return null;
}

function RoleResolutionFallback() {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.bgApp,
      }}
    >
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}

export function AppTabsNavigator({ session, profile }: Props) {
  const isAuthenticated = Boolean(session);

  if (!isAuthenticated) {
    return <GuestNavigator />;
  }

  const role = resolveRole(profile);

  switch (role) {
    case "job_seeker":
      return <JobSeekerNavigator />;

    case "employer":
      return <EmployerNavigator />;

    case "moderator":
      return <ModeratorNavigator />;

    case "super_admin":
      return <SuperAdminNavigator />;

    default:
      return <RoleResolutionFallback />;
  }
}
