import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type ViewStyle,
} from "react";
import { View, RefreshControl, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { logout as logoutUser } from "../../auth/auth.service";
import CountUp from "../../ui/admin/CountUp";
import Sparkline from "../../ui/admin/Sparkline";

import {
  getAdminDashboardSummary,
  type AdminDashboardPeriod,
  type AdminSummary,
} from "../../services/admin.dashboard.service";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppText } from "../../ui/AppText";
import { AppCard } from "../../ui/AppCard";
import { InlineAlert } from "../../ui/InlineAlert";
import { SkeletonCard } from "../../ui/Skeleton";

export default function AdminDashboard() {
  const { theme } = useTheme();

  const [data, setData] = useState<AdminSummary | null>(null);
  const [adminName, setAdminName] = useState("Admin");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<AdminDashboardPeriod>("weekly");
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      const requestId = ++requestIdRef.current;

      if (!silent) {
        setLoading(true);
      }

      setError(null);

      try {
        const result = await getAdminDashboardSummary(period);

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (!result.ok) {
          setError(result.error.message);

          if (!silent) {
            setData(null);
          }

          return;
        }

        setAdminName(result.data.adminName);
        setData(result.data.summary);
      } finally {
        if (requestId === requestIdRef.current) {
          if (!silent) {
            setLoading(false);
          }
          setRefreshing(false);
        }
      }
    },
    [period],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      void load(true);
    }, 60000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  const handleLogout = useCallback(() => {
    void logoutUser();
  }, []);

  const revenueSeries = useMemo(
    () => data?.daily_revenue?.map((d) => d.revenue) || [],
    [data],
  );

  const growth = useMemo(() => {
    if (!revenueSeries.length) return 0;

    const half = Math.floor(revenueSeries.length / 2);
    const first = revenueSeries.slice(0, half).reduce((a, b) => a + b, 0);
    const second = revenueSeries.slice(half).reduce((a, b) => a + b, 0);

    if (!first) return 0;
    return ((second - first) / first) * 100;
  }, [revenueSeries]);

  const growthPositive = growth >= 0;

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.xxxl,
    }),
    [theme.spacing.md, theme.spacing.xxxl],
  );

  const headerRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const headerTextStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      gap: 6,
    }),
    [],
  );

  const liveRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginTop: 2,
    }),
    [theme.spacing.xs],
  );

  const liveDotStyle = useMemo<ViewStyle>(
    () => ({
      width: 8,
      height: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.success,
    }),
    [theme.colors.success],
  );

  const logoutButtonStyle = useMemo<ViewStyle>(
    () => ({
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.error,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
    }),
    [theme.colors.error, theme.radius.pill, theme.spacing.md, theme.spacing.xs],
  );

  const toggleRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: 2,
    }),
    [theme.spacing.sm],
  );

  const heroCardContentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const growthRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const statsGridStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const rowGridStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const helperCardContentStyle = useMemo<ViewStyle>(
    () => ({
      gap: 6,
      flex: 1,
      justifyContent: "space-between",
    }),
    [],
  );

  const loaderWrapStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
      paddingTop: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  if (loading) {
    return (
      <AppScreen scroll>
        <View style={loaderWrapStyle}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </View>
      </AppScreen>
    );
  }

  if (!data) {
    return (
      <AppScreen scroll>
        <View style={contentStyle}>
          {error ? <InlineAlert tone="error" message={error} /> : null}
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load(true);
          }}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View style={contentStyle}>
        <View style={headerRowStyle}>
          <View style={headerTextStyle}>
            <AppText variant="h3">Welcome, {adminName}</AppText>

            <View style={liveRowStyle}>
              <View style={liveDotStyle} />
              <AppText variant="caption" tone="success" weight="700">
                Live
              </AppText>
            </View>
          </View>

          <Pressable
            onPress={handleLogout}
            accessibilityRole="button"
            style={({ pressed }) => [
              logoutButtonStyle,
              pressed ? { opacity: 0.86 } : null,
            ]}
          >
            <Ionicons name="log-out-outline" size={16} color="#fff" />
            <AppText variant="label" tone="inverse" weight="700">
              Logout
            </AppText>
          </Pressable>
        </View>

        {error ? <InlineAlert tone="error" message={error} /> : null}

        <View style={toggleRowStyle}>
          <PeriodToggle
            active={period === "weekly"}
            label="Weekly"
            onPress={() => setPeriod("weekly")}
          />
          <PeriodToggle
            active={period === "monthly"}
            label="Monthly"
            onPress={() => setPeriod("monthly")}
          />
        </View>

        <AppCard variant="premium" padding="md">
          <View style={heroCardContentStyle}>
            <StatusPill label="Revenue Overview" />

            <AppText variant="caption" tone="secondary">
              Total revenue
            </AppText>

            <CountUp
              value={data.confirmed_revenue_ugx}
              formatter={(v) => `UGX ${v.toLocaleString()}`}
              style={{
                fontSize: 26,
                fontWeight: "800",
                color: theme.colors.textPrimary,
              }}
            />

            <View style={growthRowStyle}>
              <AppText
                variant="labelLg"
                weight="700"
                tone={growthPositive ? "success" : "error"}
              >
                {growthPositive ? "↑" : "↓"} {growth.toFixed(1)}%
              </AppText>
              <AppText variant="caption" tone="secondary">
                vs previous period
              </AppText>
            </View>

            {revenueSeries.length > 0 ? (
              <View style={{ marginTop: 2 }}>
                <Sparkline data={revenueSeries} />
              </View>
            ) : null}
          </View>
        </AppCard>

        <View style={statsGridStyle}>
          <MetricCard
            label="Total Users"
            value={data.total_users}
            tone="primary"
          />
          <MetricCard
            label="Active Jobs"
            value={data.active_jobs}
            tone="success"
          />
          <MetricCard
            label="Flagged Jobs"
            value={data.flagged_jobs}
            tone="error"
          />
          <MetricCard
            label="Active Premium"
            value={data.active_premium_users}
            tone="warning"
          />
        </View>

        <View style={rowGridStyle}>
          <AppCard
            variant="elevated"
            padding="md"
            style={{ flex: 1, minHeight: 110 }}
          >
            <View style={helperCardContentStyle}>
              <AppText variant="caption" tone="secondary" uppercase>
                Pending Payments
              </AppText>
              <AppText variant="h2">{data.pending_payments}</AppText>
              <AppText variant="bodySm" tone="secondary">
                Payments still awaiting confirmation.
              </AppText>
            </View>
          </AppCard>

          <AppCard
            variant="elevated"
            padding="md"
            style={{ flex: 1, minHeight: 110 }}
          >
            <View style={helperCardContentStyle}>
              <AppText variant="caption" tone="secondary" uppercase>
                Today Revenue
              </AppText>
              <AppText variant="h2">
                UGX {data.today_revenue.toLocaleString()}
              </AppText>
              <AppText variant="bodySm" tone="secondary">
                Confirmed platform revenue for today.
              </AppText>
            </View>
          </AppCard>
        </View>

        {data.flagged_jobs > 0 ? (
          <InlineAlert
            tone="warning"
            title="Flagged jobs need attention"
            message={`${data.flagged_jobs} flagged job${data.flagged_jobs > 1 ? "s require" : " requires"} moderation review.`}
          />
        ) : null}
      </View>
    </AppScreen>
  );
}

function PeriodToggle({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        {
          minHeight: 40,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.pill,
          borderWidth: 1,
          borderColor: active
            ? theme.colors.primary
            : theme.colors.borderDefault,
          backgroundColor: active
            ? theme.colors.primary
            : theme.colors.bgSurfaceElevated,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <AppText
        variant="label"
        weight="700"
        tone={active ? "inverse" : "primary"}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "success" | "error" | "warning";
}) {
  const { theme } = useTheme();

  const numberColor =
    tone === "success"
      ? theme.colors.success
      : tone === "error"
        ? theme.colors.error
        : tone === "warning"
          ? theme.colors.warning
          : theme.colors.primary;

  return (
    <AppCard
      variant="elevated"
      padding="md"
      style={{
        width: "48.5%",
        minHeight: 102,
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "space-between",
        }}
      >
        <AppText variant="caption" tone="secondary" uppercase>
          {label}
        </AppText>

        <CountUp
          value={value}
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: numberColor,
          }}
        />
      </View>
    </AppCard>
  );
}

function StatusPill({ label }: { label: string }) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 6,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.bgSurfaceElevated,
        borderWidth: 1,
        borderColor: theme.colors.borderDefault,
      }}
    >
      <AppText variant="caption" tone="primary" weight="700">
        {label}
      </AppText>
    </View>
  );
}
