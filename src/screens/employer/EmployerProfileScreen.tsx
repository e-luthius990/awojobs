import React, { useMemo, useCallback, useState, useEffect } from "react";
import { Alert, Linking, Switch, View, type ViewStyle } from "react-native";

import { supabase } from "../../core/supabase";
import {
  logout as logoutUser,
  closeEmployerAccount,
} from "../../auth/auth.service";
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
import ConfirmPasswordModal from "../../ui/account/ConfirmPasswordModal";

const TERMS_URL = "https://awojobs.com/terms";

export default function EmployerProfileScreen() {
  const { session, loading: sessionLoading } = useSession();
  const { theme, isDark, toggleTheme } = useTheme();

  const userId = session?.user?.id ?? null;
  const { profile, loading: profileLoading } = useProfile(userId);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [closingAccount, setClosingAccount] = useState(false);
  const [confirmCloseVisible, setConfirmCloseVisible] = useState(false);
  const [accountActionError, setAccountActionError] = useState<string | null>(
    null,
  );

  const isLoading = sessionLoading || profileLoading;

  useEffect(() => {
    if (!profile) return;

    setNotificationsEnabled(
      "push_opt_in" in profile && typeof profile.push_opt_in === "boolean"
        ? profile.push_opt_in
        : false,
    );
  }, [profile]);

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    }),
    [theme.spacing.lg, theme.spacing.xxxl],
  );

  const cardContentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.lg,
    }),
    [theme.spacing.lg],
  );

  const topRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "flex-start",
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

  const infoGroupStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const settingsWrapStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const settingRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const settingTextWrapStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const actionsWrapStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
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

  const handleToggleNotifications = useCallback(async () => {
    if (
      !userId ||
      savingNotifications ||
      closingAccount ||
      confirmCloseVisible
    ) {
      return;
    }

    const nextValue = !notificationsEnabled;
    setNotificationsEnabled(nextValue);
    setSavingNotifications(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ push_opt_in: nextValue })
        .eq("id", userId);

      if (error) throw error;
    } catch {
      setNotificationsEnabled(!nextValue);
      Alert.alert("Update failed", "Could not update notification settings.");
    } finally {
      setSavingNotifications(false);
    }
  }, [
    closingAccount,
    confirmCloseVisible,
    notificationsEnabled,
    savingNotifications,
    userId,
  ]);

  const handleOpenTerms = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(TERMS_URL);
      if (!supported) {
        Alert.alert("Unavailable", "Could not open the terms page.");
        return;
      }

      await Linking.openURL(TERMS_URL);
    } catch {
      Alert.alert("Unavailable", "Could not open the terms page.");
    }
  }, []);

  const runCloseAccount = useCallback(async () => {
    try {
      setClosingAccount(true);
      setAccountActionError(null);

      const result = await closeEmployerAccount();

      if (result.action !== "closed") {
        throw new Error("Unable to close account.");
      }

      Alert.alert(
        "Account closed",
        "Your employer account has been closed and you have been signed out.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to close account right now.";

      setAccountActionError(message);
      Alert.alert("Unable to close account", message);
    } finally {
      setClosingAccount(false);
    }
  }, []);

  const handleConfirmedClose = useCallback(() => {
    setConfirmCloseVisible(false);

    Alert.alert(
      "Close account",
      "This closes your employer account, signs you out, and keeps job, application, and payment history where required. This action cannot be undone from the app.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close account",
          style: "destructive",
          onPress: () => {
            void runCloseAccount();
          },
        },
      ],
    );
  }, [runCloseAccount]);

  const handleCloseAccount = useCallback(() => {
    if (closingAccount) return;
    setConfirmCloseVisible(true);
  }, [closingAccount]);

  if (isLoading) {
    return (
      <AppScreen scroll>
        <View style={{ gap: theme.spacing.md }}>
          <AppHeader title="Employer Profile" />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
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

  const phoneValue =
    typeof profile.phone_number === "string" && profile.phone_number.trim()
      ? profile.phone_number.trim()
      : "—";

  const fullNameValue =
    typeof profile.full_name === "string" && profile.full_name.trim()
      ? profile.full_name.trim()
      : "Employer account";

  const businessNameValue =
    typeof profile.business_name === "string" && profile.business_name.trim()
      ? profile.business_name.trim()
      : "—";

  return (
    <AppScreen scroll>
      <View style={contentStyle}>
        <AppHeader
          title="Employer Profile"
          subtitle="Manage your employer account and settings"
        />

        <AppCard variant="elevated" padding="lg">
          <View style={cardContentStyle}>
            <View style={topRowStyle}>
              <View style={topTextStyle}>
                <AppText variant="h3">{fullNameValue}</AppText>
              </View>

              <StatusBadge label="EMPLOYER" tone="info" />
            </View>

            <View style={infoGroupStyle}>
              <ProfileRow label="Phone Number" value={phoneValue} />
              <ProfileRow label="Business Name" value={businessNameValue} />
            </View>
          </View>
        </AppCard>

        <AppCard variant="default" padding="lg">
          <View style={settingsWrapStyle}>
            <AppText variant="titleLg">Preferences</AppText>

            <View style={settingRowStyle}>
              <View style={settingTextWrapStyle}>
                <AppText variant="title">Theme</AppText>
                <AppText variant="bodySm" tone="secondary">
                  {isDark ? "Dark mode is enabled." : "Light mode is enabled."}
                </AppText>
              </View>

              <Switch
                value={Boolean(isDark)}
                onValueChange={() => {
                  void toggleTheme();
                }}
                trackColor={{
                  false: theme.colors.borderMuted,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.bgSurfaceElevated}
              />
            </View>

            <View style={settingRowStyle}>
              <View style={settingTextWrapStyle}>
                <AppText variant="title">Notifications</AppText>
                <AppText variant="bodySm" tone="secondary">
                  {notificationsEnabled
                    ? "Job and application notifications are enabled."
                    : "Job and application notifications are turned off."}
                </AppText>
              </View>

              <Switch
                value={notificationsEnabled}
                onValueChange={() => {
                  void handleToggleNotifications();
                }}
                disabled={
                  savingNotifications || closingAccount || confirmCloseVisible
                }
                trackColor={{
                  false: theme.colors.borderMuted,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.bgSurfaceElevated}
              />
            </View>

            <AppButton
              title="Terms"
              onPress={() => {
                void handleOpenTerms();
              }}
              variant="secondary"
              disabled={closingAccount || confirmCloseVisible}
            />
          </View>
        </AppCard>

        <AppCard variant="default" padding="lg">
          <View style={actionsWrapStyle}>
            <AppText variant="titleLg">Account actions</AppText>

            <AppText variant="bodySm" tone="secondary">
              Closing your account disables employer access and signs you out.
              Existing jobs, applications, and payment history may be retained.
            </AppText>

            {accountActionError ? (
              <InlineAlert
                tone="error"
                title="Action failed"
                message={accountActionError}
              />
            ) : null}

            <AppButton
              title={closingAccount ? "Closing account..." : "Close account"}
              onPress={handleCloseAccount}
              variant="destructive"
              disabled={
                closingAccount || savingNotifications || confirmCloseVisible
              }
            />

            <AppButton
              title="Logout"
              onPress={handleLogout}
              variant="secondary"
              disabled={closingAccount || confirmCloseVisible}
            />
          </View>
        </AppCard>
      </View>

      <ConfirmPasswordModal
        visible={confirmCloseVisible}
        phoneNumber={profile.phone_number ?? null}
        title="Confirm password"
        message="Enter your password to continue with employer account closure."
        confirmLabel="Continue"
        busyLabel="Checking..."
        onCancel={() => setConfirmCloseVisible(false)}
        onSuccess={handleConfirmedClose}
      />
    </AppScreen>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 4 }}>
      <AppText variant="caption" tone="secondary" uppercase>
        {label}
      </AppText>
      <AppText variant="title">{value}</AppText>
    </View>
  );
}
