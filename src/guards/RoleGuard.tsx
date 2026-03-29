import React, { useCallback, useMemo, type ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { useSession } from "../state/useSession";
import { useProfile } from "../state/useProfile";

import { AppScreen } from "../ui/AppScreen";
import { AppCard } from "../ui/AppCard";
import { AppButton } from "../ui/AppButton";
import { AppText } from "../ui/AppText";
import { SkeletonCard } from "../ui/Skeleton";
import { useTheme } from "../theme/useTheme";

type Role = "employer" | "job_seeker" | "moderator" | "super_admin";

type Props = {
  allowed: Role[];
  children: ReactNode;
};

function isAllowedRole(value: unknown): value is Role {
  return (
    value === "employer" ||
    value === "job_seeker" ||
    value === "moderator" ||
    value === "super_admin"
  );
}

export function RoleGuard({ allowed, children }: Props) {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  const { session, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;
  const { profile, loading: profileLoading } = useProfile(userId);

  const resolvedRole: Role | null = isAllowedRole(profile?.role)
    ? profile.role
    : null;

  const goToLogin = useCallback(() => {
    navigation.getParent()?.navigate("AuthModal", {
      screen: "Login",
    });
  }, [navigation]);

  const goToJobs = useCallback(() => {
    navigation.getParent()?.navigate("App");
  }, [navigation]);

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.lg,
      width: "100%",
    }),
    [theme.spacing.lg],
  );

  const cardStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  if (sessionLoading || profileLoading) {
    return (
      <AppScreen centerContent>
        <View style={contentStyle}>
          <SkeletonCard lines={3} />
        </View>
      </AppScreen>
    );
  }

  if (!session) {
    return (
      <AppScreen centerContent>
        <View style={contentStyle}>
          <AppCard variant="elevated" padding="lg">
            <View style={cardStyle}>
              <AppText variant="titleLg">Sign in required</AppText>
              <AppText variant="bodySm" tone="secondary">
                Please sign in to continue.
              </AppText>

              <AppButton title="Login" onPress={goToLogin} variant="primary" />

              <AppButton
                title="Back to Jobs"
                onPress={goToJobs}
                variant="secondary"
              />
            </View>
          </AppCard>
        </View>
      </AppScreen>
    );
  }

  if (!profile) {
    return (
      <AppScreen centerContent>
        <View style={contentStyle}>
          <AppCard variant="elevated" padding="lg">
            <View style={cardStyle}>
              <AppText variant="titleLg">Profile unavailable</AppText>
              <AppText variant="bodySm" tone="secondary">
                We couldn’t load your profile.
              </AppText>

              <AppButton
                title="Back to Jobs"
                onPress={goToJobs}
                variant="primary"
              />
            </View>
          </AppCard>
        </View>
      </AppScreen>
    );
  }

  if (!resolvedRole || !allowed.includes(resolvedRole)) {
    return (
      <AppScreen centerContent>
        <View style={contentStyle}>
          <AppCard variant="elevated" padding="lg">
            <View style={cardStyle}>
              <AppText variant="titleLg">Access restricted</AppText>
              <AppText variant="bodySm" tone="secondary">
                You do not have permission to access this section.
              </AppText>

              <AppButton
                title="Back to Jobs"
                onPress={goToJobs}
                variant="primary"
              />
            </View>
          </AppCard>
        </View>
      </AppScreen>
    );
  }

  return <>{children}</>;
}

export function RequireModerator({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allowed={["moderator", "super_admin"]}>{children}</RoleGuard>
  );
}

export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  return <RoleGuard allowed={["super_admin"]}>{children}</RoleGuard>;
}

export function RequireEmployer({ children }: { children: ReactNode }) {
  return <RoleGuard allowed={["employer"]}>{children}</RoleGuard>;
}

export function RequireJobSeeker({ children }: { children: ReactNode }) {
  return <RoleGuard allowed={["job_seeker"]}>{children}</RoleGuard>;
}
