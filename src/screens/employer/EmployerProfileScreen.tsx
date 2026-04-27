import React, { useMemo, useCallback, useState, useEffect } from "react";
import { Alert, Linking, Switch, View } from "react-native";

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
    setNotificationsEnabled(!!profile.push_opt_in);
  }, [profile]);

  /* ---------------- AUTH ---------------- */

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

  /* ---------------- NOTIFICATIONS ---------------- */

  const handleToggleNotifications = useCallback(async () => {
    if (!userId || savingNotifications || closingAccount || confirmCloseVisible)
      return;

    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    setSavingNotifications(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ push_opt_in: next })
        .eq("id", userId);

      if (error) throw error;
    } catch {
      setNotificationsEnabled(!next);
      Alert.alert("Update failed", "Could not update notifications.");
    } finally {
      setSavingNotifications(false);
    }
  }, [
    userId,
    notificationsEnabled,
    savingNotifications,
    closingAccount,
    confirmCloseVisible,
  ]);

  /* ---------------- TERMS ---------------- */

  const handleOpenTerms = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(TERMS_URL);
      if (!supported) {
        Alert.alert("Unavailable", "Could not open terms.");
        return;
      }
      await Linking.openURL(TERMS_URL);
    } catch {
      Alert.alert("Unavailable", "Could not open terms.");
    }
  }, []);

  /* ---------------- CLOSE ACCOUNT ---------------- */

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
        "Your employer account has been closed successfully.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to close account.";

      setAccountActionError(message);
      Alert.alert("Error", message);
    } finally {
      setClosingAccount(false);
    }
  }, []);

  const handleConfirmedClose = useCallback(() => {
    setConfirmCloseVisible(false);

    Alert.alert(
      "Final confirmation",
      "This will permanently close your employer account and sign you out.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close account",
          style: "destructive",
          onPress: () => void runCloseAccount(),
        },
      ],
    );
  }, [runCloseAccount]);

  const handleCloseAccount = useCallback(() => {
    if (closingAccount) return;
    setConfirmCloseVisible(true);
  }, [closingAccount]);

  /* ---------------- LOADING ---------------- */

  if (isLoading) {
    return (
      <AppScreen scroll>
        <View style={{ gap: theme.spacing.md }}>
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
          message="We could not load your account."
          action={<AppButton title="Retry" onPress={handleLogout} />}
        />
      </AppScreen>
    );
  }

  const fullName = profile.full_name?.trim() || "Employer account";
  const phone = profile.phone_number?.trim() || "—";
  const business = profile.business_name?.trim() || "—";

  /* ---------------- UI ---------------- */

  return (
    <AppScreen scroll>
      <View
        style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xxxl }}
      >
        <AppHeader
          title="Employer Profile"
          subtitle="Manage your account & settings"
        />

        {/* PROFILE */}
        <AppCard variant="elevated" padding="lg">
          <View style={{ gap: theme.spacing.sm }}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <AppText variant="h3">{fullName}</AppText>
              <StatusBadge label="EMPLOYER" tone="info" />
            </View>

            <AppText tone="secondary">{phone}</AppText>
            <AppText tone="secondary">{business}</AppText>
          </View>
        </AppCard>

        {/* SETTINGS */}
        <AppCard padding="lg">
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="titleLg">Preferences</AppText>

            <Setting
              title="Theme"
              subtitle={isDark ? "Dark mode enabled" : "Light mode enabled"}
              right={<Switch value={isDark} onValueChange={toggleTheme} />}
            />

            <Setting
              title="Notifications"
              subtitle="Job alerts & updates"
              right={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  disabled={savingNotifications}
                />
              }
            />

            <AppButton
              title="Terms of Use"
              onPress={handleOpenTerms}
              variant="secondary"
            />
          </View>
        </AppCard>

        {/* ACCOUNT */}
        <AppCard padding="lg">
          <View style={{ gap: theme.spacing.sm }}>
            <AppText variant="titleLg">Account</AppText>

            {accountActionError && (
              <InlineAlert
                tone="error"
                title="Error"
                message={accountActionError}
              />
            )}

            <AppButton
              title="Logout"
              variant="secondary"
              onPress={handleLogout}
            />
          </View>
        </AppCard>

        {/* 🔴 DANGER ZONE */}
        <AppCard
          padding="lg"
          style={{
            borderWidth: 1,
            borderColor: theme.colors.error ?? "#E5484D",
          }}
        >
          <View style={{ gap: theme.spacing.sm }}>
            <AppText variant="titleLg" style={{ color: theme.colors.error }}>
              Danger zone
            </AppText>

            <AppText tone="secondary" variant="bodySm">
              Closing your account permanently disables employer access. This
              action requires password confirmation.
            </AppText>

            <AppButton
              title={closingAccount ? "Closing account..." : "Close account"}
              variant="destructive"
              onPress={handleCloseAccount}
              disabled={closingAccount || confirmCloseVisible}
            />
          </View>
        </AppCard>
      </View>

      {/* CONFIRM MODAL (UNCHANGED LOGIC) */}
      <ConfirmPasswordModal
        visible={confirmCloseVisible}
        phoneNumber={profile.phone_number ?? null}
        title="Confirm password"
        message="Enter your password to continue."
        confirmLabel="Continue"
        busyLabel="Checking..."
        onCancel={() => setConfirmCloseVisible(false)}
        onSuccess={handleConfirmedClose}
      />
    </AppScreen>
  );
}

/* ---------------- SMALL COMPONENT ---------------- */

function Setting({ title, subtitle, right }: any) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <View style={{ flex: 1 }}>
        <AppText variant="title">{title}</AppText>
        <AppText tone="secondary" variant="bodySm">
          {subtitle}
        </AppText>
      </View>
      {right}
    </View>
  );
}
