import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ViewStyle,
} from "react";
import { Alert, Linking, Switch, View } from "react-native";

import { supabase } from "../../core/supabase";
import {
  logout as logoutUser,
  deleteJobSeekerAccount,
} from "../../auth/auth.service";
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
import { SkeletonCard } from "../../ui/Skeleton";
import ConfirmPasswordModal from "../../ui/account/ConfirmPasswordModal";

const TERMS_URL = "https://awojobs.com/terms";

export default function JobSeekerProfileScreen() {
  const { theme, isDark, toggleTheme } = useTheme();

  const { session, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;

  const { profile, loading: profileLoading } = useProfile(userId);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
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

  const accountActionsStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const handleLogout = useCallback(() => {
    if (deletingAccount || confirmDeleteVisible) return;

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
  }, [confirmDeleteVisible, deletingAccount]);

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
      deletingAccount ||
      confirmDeleteVisible
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
    confirmDeleteVisible,
    deletingAccount,
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

  const runDeleteAccount = useCallback(async () => {
    try {
      setDeletingAccount(true);
      setAccountActionError(null);

      const result = await deleteJobSeekerAccount();

      if (result.action !== "deleted") {
        throw new Error("Unable to delete account.");
      }

      Alert.alert(
        "Account deleted",
        "Your account has been permanently removed.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to delete account right now.";

      setAccountActionError(message);
      Alert.alert("Unable to delete account", message);
    } finally {
      setDeletingAccount(false);
    }
  }, []);

  const handleConfirmedDelete = useCallback(() => {
    setConfirmDeleteVisible(false);

    Alert.alert(
      "Delete account",
      "This permanently removes your account and clears your job seeker data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () => {
            void runDeleteAccount();
          },
        },
      ],
    );
  }, [runDeleteAccount]);

  const handleDeleteAccount = useCallback(() => {
    if (deletingAccount) return;
    setConfirmDeleteVisible(true);
  }, [deletingAccount]);

  if (isLoading) {
    return (
      <AppScreen scroll>
        <View style={{ gap: theme.spacing.md }}>
          <AppHeader title="My Profile" />
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
      : "Unnamed user";

  const roleValue =
    typeof profile.role === "string" && profile.role.trim()
      ? profile.role.trim().replace(/_/g, " ").toUpperCase()
      : "—";

  return (
    <AppScreen scroll>
      <View style={sectionGapStyle}>
        <AppHeader
          title="My Profile"
          subtitle="Manage your account and preferences"
        />

        <AppCard variant="elevated" padding="lg">
          <View style={cardGapStyle}>
            <View style={topRowStyle}>
              <View style={topTextStyle}>
                <AppText variant="h3">{fullNameValue}</AppText>
              </View>

              <StatusBadge label={roleValue} tone="info" />
            </View>

            <View style={cardGapStyle}>
              <ProfileRow label="Phone Number" value={phoneValue} />
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
                  savingNotifications || deletingAccount || confirmDeleteVisible
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
              disabled={deletingAccount || confirmDeleteVisible}
            />
          </View>
        </AppCard>

        <AppCard variant="default" padding="lg">
          <View style={accountActionsStyle}>
            <AppText variant="titleLg">Account actions</AppText>

            <AppText variant="bodySm" tone="secondary">
              Deleting your account permanently removes your job seeker access
              and clears your account data.
            </AppText>

            {accountActionError ? (
              <InlineAlert
                tone="error"
                title="Action failed"
                message={accountActionError}
              />
            ) : null}

            <AppButton
              title={deletingAccount ? "Deleting account..." : "Delete account"}
              onPress={handleDeleteAccount}
              variant="destructive"
              disabled={
                deletingAccount || savingNotifications || confirmDeleteVisible
              }
            />

            <AppButton
              title="Logout"
              onPress={handleLogout}
              variant="secondary"
              disabled={deletingAccount || confirmDeleteVisible}
            />
          </View>
        </AppCard>
      </View>

      <ConfirmPasswordModal
        visible={confirmDeleteVisible}
        phoneNumber={profile.phone_number ?? null}
        title="Confirm password"
        message="Enter your password to continue with account deletion."
        confirmLabel="Continue"
        busyLabel="Checking..."
        onCancel={() => setConfirmDeleteVisible(false)}
        onSuccess={handleConfirmedDelete}
      />
    </AppScreen>
  );
}

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
