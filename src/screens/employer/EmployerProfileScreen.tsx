import React, { useMemo, useCallback, type ReactNode } from "react";
import { Alert, View, type ViewStyle } from "react-native";

import { logout as logoutUser } from "../../auth/auth.service";
import { useSession } from "../../state/useSession";
import { useProfile } from "../../state/useProfile";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppHeader } from "../../ui/AppHeader";
import { AppText } from "../../ui/AppText";
import { AppCard } from "../../ui/AppCard";
import { AppButton } from "../../ui/AppButton";
import { EmptyState } from "../../ui/EmptyState";
import { InlineAlert } from "../../ui/InlineAlert";
import { SkeletonCard } from "../../ui/Skeleton";
import { StatusBadge } from "../../ui/StatusBadge";

export default function EmployerProfileScreen() {
  const { session, loading: sessionLoading } = useSession();
  const { theme } = useTheme();

  const userId = session?.user?.id ?? null;
  const { profile, loading: profileLoading } = useProfile(userId);

  const isLoading = sessionLoading || profileLoading;

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    }),
    [theme.spacing.lg, theme.spacing.xxxl],
  );

  const profileCardContentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.lg,
    }),
    [theme.spacing.lg],
  );

  const profileTopRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const profileTopTextStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const infoGroupStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const actionsWrapStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const loaderWrapStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const handleLogout = useCallback(() => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logoutUser();
          } catch {
            Alert.alert("Logout failed", "Please try again.");
          }
        },
      },
    ]);
  }, []);

  const handleRelogin = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      Alert.alert("Logout failed", "Please try again.");
    }
  }, []);

  if (isLoading) {
    return (
      <AppScreen scroll>
        <View style={loaderWrapStyle}>
          <AppHeader title="Employer Profile" />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </View>
      </AppScreen>
    );
  }

  if (!profile) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="Profile unavailable"
          message="We could not load your account details."
          action={
            <AppButton
              title="Re-login"
              onPress={handleRelogin}
              variant="primary"
            />
          }
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={contentStyle}>
        <AppHeader
          title="Employer Profile"
          subtitle="Manage your employer account and settings"
        />

        <AppCard variant="elevated" padding="lg">
          <View style={profileCardContentStyle}>
            <View style={profileTopRowStyle}>
              <View style={profileTopTextStyle}>
                <AppText variant="h3">
                  {profile.full_name ?? "Employer account"}
                </AppText>
                <AppText variant="bodySm" tone="secondary">
                  Review your account information and business-facing access.
                </AppText>
              </View>

              <StatusBadge label="Employer" tone="info" />
            </View>

            <View style={infoGroupStyle}>
              <ProfileRow label="Full Name" value={profile.full_name ?? "—"} />
              <ProfileRow
                label="Phone Number"
                value={
                  "phone_number" in profile
                    ? (profile.phone_number ?? "—")
                    : "phone" in profile
                      ? ((profile as { phone?: string | null }).phone ?? "—")
                      : "—"
                }
              />
              <ProfileRow label="Role" value={profile.role ?? "—"} />
            </View>
          </View>
        </AppCard>

        <InlineAlert
          tone="info"
          title="Account security"
          message="Keep your sign-in details private and use a strong password for your employer account."
        />

        <AppCard variant="default" padding="lg">
          <View style={actionsWrapStyle}>
            <AppText variant="titleLg">Account actions</AppText>

            <AppButton
              title="Change Password"
              onPress={() =>
                Alert.alert(
                  "Not available yet",
                  "Password change flow has not been connected yet.",
                )
              }
              variant="secondary"
            />

            <AppButton
              title="Logout"
              onPress={handleLogout}
              variant="destructive"
            />
          </View>
        </AppCard>
      </View>
    </AppScreen>
  );
}

function ProfileRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={{ gap: 4 }}>
      <AppText variant="caption" tone="secondary" uppercase>
        {label}
      </AppText>
      <AppText variant="title">{value ?? "—"}</AppText>
    </View>
  );
}
