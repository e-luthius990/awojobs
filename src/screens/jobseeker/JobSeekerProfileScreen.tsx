import React, { useCallback, useMemo, type ViewStyle } from "react";
import { ActivityIndicator, Alert, View } from "react-native";

import { logout as logoutUser } from "../../auth/auth.service";
import { useSession } from "../../state/useSession";
import { useProfile } from "../../state/useProfile";
import { useTheme } from "../../theme/useTheme";

import { AppScreen } from "../../ui/AppScreen";
import { AppHeader } from "../../ui/AppHeader";
import { AppCard } from "../../ui/AppCard";
import { AppButton } from "../../ui/AppButton";
import { AppText } from "../../ui/AppText";
import { EmptyState } from "../../ui/EmptyState";
import { InlineAlert } from "../../ui/InlineAlert";
import { StatusBadge } from "../../ui/StatusBadge";

/* =====================================================
   SCREEN
===================================================== */

export default function JobSeekerProfileScreen({ navigation }: any) {
  const { theme } = useTheme();

  const { session, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;

  const { profile, loading: profileLoading } = useProfile(userId);

  const isLoading = sessionLoading || profileLoading;

  const phoneValue =
    profile && "phone_number" in profile
      ? (profile.phone_number ?? "—")
      : profile && "phone" in profile
        ? ((profile as { phone?: string | null }).phone ?? "—")
        : "—";

  const isPremium =
    profile && "is_premium" in profile
      ? (profile as { is_premium?: boolean | null }).is_premium === true
      : false;

  const loaderWrapStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const sectionGapStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    }),
    [theme.spacing.lg, theme.spacing.xxxl],
  );

  const cardGapStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const topRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const topTextStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
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

  const handleUpgradePremium = useCallback(() => {
    navigation.navigate("Premium");
  }, [navigation]);

  if (isLoading) {
    return (
      <AppScreen centerContent>
        <View style={loaderWrapStyle}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <AppText variant="bodySm" tone="secondary">
            Loading your profile…
          </AppText>
        </View>
      </AppScreen>
    );
  }

  if (!profile) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="Profile unavailable"
          message="We couldn’t load your account details."
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
      <View style={sectionGapStyle}>
        <AppHeader
          title="My Profile"
          subtitle="Manage your account and premium access"
        />

        <AppCard variant="elevated" padding="lg">
          <View style={cardGapStyle}>
            <View style={topRowStyle}>
              <View style={topTextStyle}>
                <AppText variant="h3">
                  {profile.full_name || "Unnamed user"}
                </AppText>
                <AppText variant="bodySm" tone="secondary">
                  {phoneValue}
                </AppText>
              </View>

              <StatusBadge
                label={isPremium ? "Premium" : "Free"}
                tone={isPremium ? "premium" : "default"}
              />
            </View>

            <View style={cardGapStyle}>
              <ProfileRow label="Full Name" value={profile.full_name || "—"} />
              <ProfileRow label="Phone" value={phoneValue} />
              <ProfileRow label="Role" value={profile.role || "—"} />
            </View>
          </View>
        </AppCard>

        <AppCard variant={isPremium ? "premium" : "default"} padding="lg">
          <View style={cardGapStyle}>
            <View style={topTextStyle}>
              <AppText variant="titleLg">
                {isPremium ? "Premium Active" : "Free Account"}
              </AppText>

              <AppText variant="bodySm" tone="secondary">
                {isPremium
                  ? "You can access national jobs across Uganda."
                  : "Upgrade to Premium to unlock national jobs and broader discovery."}
              </AppText>
            </View>

            {isPremium ? (
              <InlineAlert
                tone="success"
                title="National access enabled"
                message="Your account can browse jobs beyond your local area."
              />
            ) : (
              <AppButton
                title="Upgrade to Premium"
                onPress={handleUpgradePremium}
                variant="primary"
              />
            )}
          </View>
        </AppCard>

        <AppCard variant="default" padding="lg">
          <View style={cardGapStyle}>
            <AppText variant="title">Account Actions</AppText>

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

/* =====================================================
   SUPPORT
===================================================== */

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 4 }}>
      <AppText variant="caption" tone="tertiary" uppercase>
        {label}
      </AppText>
      <AppText variant="body" weight="700">
        {value}
      </AppText>
    </View>
  );
}
