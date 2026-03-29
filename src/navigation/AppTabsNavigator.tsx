import React, { useCallback } from "react";
import { ActivityIndicator, View } from "react-native";
import type { Session } from "@supabase/supabase-js";

import { GuestNavigator } from "./GuestNavigator";
import { JobSeekerNavigator } from "./JobSeekerNavigator";
import { EmployerNavigator } from "./EmployerNavigator";
import ModeratorNavigator from "./ModeratorNavigator";
import { SuperAdminNavigator } from "./SuperAdminNavigator";

import { logout as logoutUser } from "../auth/auth.service";
import { useTheme } from "../theme/useTheme";
import { AppText } from "../ui/AppText";
import { AppButton } from "../ui/AppButton";
import type { Profile } from "../types/profile";

type SessionErrorCode = "SESSION_BOOTSTRAP_FAILED" | "SESSION_EXPIRED" | null;

type ProfileErrorCode =
  | "PROFILE_MISSING"
  | "PROFILE_SUSPENDED"
  | "PROFILE_ACCESS_DENIED"
  | "PROFILE_INVALID"
  | "PROFILE_RETRYABLE"
  | "PROFILE_UNKNOWN"
  | null;

type Props = {
  session: Session | null;
  sessionLoading: boolean;
  sessionErrorCode: SessionErrorCode;
  profile: Profile | null;
  profileLoading: boolean;
  profileErrorCode: ProfileErrorCode;
  bootstrapping: boolean;
  isSuspended: boolean;
};

type AppRole = "job_seeker" | "employer" | "moderator" | "super_admin" | null;

function resolveRole(profile: Profile | null): AppRole {
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

function CenteredState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.bgApp,
        padding: 24,
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 420,
        }}
      >
        <AppText
          style={{
            textAlign: "center",
            color: theme.colors.text,
            marginBottom: 12,
          }}
        >
          {title}
        </AppText>

        <AppText
          style={{
            textAlign: "center",
            color: theme.colors.textMuted ?? theme.colors.text,
          }}
        >
          {message}
        </AppText>
      </View>

      {actionLabel && onAction ? (
        <View
          style={{
            marginTop: 20,
            width: "100%",
            maxWidth: 320,
          }}
        >
          <AppButton title={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

function FullScreenSpinner() {
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

function useSignOutAction() {
  return useCallback(() => {
    void logoutUser();
  }, []);
}

function FullScreenBlockedState() {
  const handleSignOut = useSignOutAction();

  return (
    <CenteredState
      title="Your account is currently suspended."
      message="Please contact support for help."
      actionLabel="Sign Out"
      onAction={handleSignOut}
    />
  );
}

function FullScreenSessionError() {
  const handleSignOut = useSignOutAction();

  return (
    <CenteredState
      title="We could not verify your session."
      message="Please sign in again to continue."
      actionLabel="Sign Out"
      onAction={handleSignOut}
    />
  );
}

function FullScreenProfileRetryState() {
  const handleSignOut = useSignOutAction();

  return (
    <CenteredState
      title="We could not load your account right now."
      message="Please try again in a moment. If this continues, sign in again."
      actionLabel="Sign Out"
      onAction={handleSignOut}
    />
  );
}

function FullScreenProfileError() {
  const handleSignOut = useSignOutAction();

  return (
    <CenteredState
      title="We could not verify your account profile."
      message="Try signing in again. If the problem continues, your account setup may be incomplete."
      actionLabel="Sign Out"
      onAction={handleSignOut}
    />
  );
}

export function AppTabsNavigator({
  session,
  sessionLoading,
  sessionErrorCode,
  profile,
  profileLoading,
  profileErrorCode,
  bootstrapping,
  isSuspended,
}: Props) {
  if (bootstrapping || sessionLoading || (!!session && profileLoading)) {
    return <FullScreenSpinner />;
  }

  if (!session) {
    return <GuestNavigator />;
  }

  if (
    sessionErrorCode === "SESSION_EXPIRED" ||
    sessionErrorCode === "SESSION_BOOTSTRAP_FAILED"
  ) {
    return <FullScreenSessionError />;
  }

  if (isSuspended || profileErrorCode === "PROFILE_SUSPENDED") {
    return <FullScreenBlockedState />;
  }

  if (profileErrorCode === "PROFILE_RETRYABLE") {
    return <FullScreenProfileRetryState />;
  }

  if (
    profileErrorCode === "PROFILE_MISSING" ||
    profileErrorCode === "PROFILE_INVALID" ||
    profileErrorCode === "PROFILE_ACCESS_DENIED" ||
    profileErrorCode === "PROFILE_UNKNOWN"
  ) {
    return <FullScreenProfileError />;
  }

  const role = resolveRole(profile);

  if (!profile || !role) {
    return <FullScreenProfileError />;
  }

  switch (role) {
    case "job_seeker":
      return <JobSeekerNavigator />;
    case "employer":
      return <EmployerNavigator />;
    case "moderator":
      return <ModeratorNavigator />;
    case "super_admin":
      return <SuperAdminNavigator />;
  }
}
