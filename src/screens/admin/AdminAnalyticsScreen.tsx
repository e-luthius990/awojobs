import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ViewStyle,
} from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  Dimensions,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { LineChart } from "react-native-chart-kit";

import { supabase } from "../../core/supabase";
import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppCard } from "../../ui/AppCard";
import { AppText } from "../../ui/AppText";
import { InlineAlert } from "../../ui/InlineAlert";
import { EmptyState } from "../../ui/EmptyState";

const screenWidth = Dimensions.get("window").width;

type RevenuePoint = { day: string; revenue: number };
type JobsPoint = { day: string; jobs: number };

type SummaryMeta = {
  today_revenue?: number;
  active_premium_users?: number;
  daily_revenue?: RevenuePoint[];
};

export default function AdminAnalyticsScreen() {
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<7 | 30>(30);
  const [error, setError] = useState<string | null>(null);

  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [jobsData, setJobsData] = useState<JobsPoint[]>([]);
  const [summaryMeta, setSummaryMeta] = useState<SummaryMeta | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);

      try {
        const [
          { data: summary, error: revenueErr },
          { data: jobsMetrics, error: jobsErr },
        ] = await Promise.all([
          supabase.rpc("super_admin_payments_summary"),
          supabase.rpc("super_admin_daily_jobs", { p_days: range }),
        ]);

        if (revenueErr) throw revenueErr;
        if (jobsErr) throw jobsErr;

        setRevenueData(summary?.daily_revenue?.slice(-range) ?? []);
        setSummaryMeta(summary ?? null);
        setJobsData(jobsMetrics ?? []);
      } catch {
        setError("Failed to load analytics.");
        if (!silent) {
          setRevenueData([]);
          setJobsData([]);
          setSummaryMeta(null);
        }
      } finally {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [range],
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

  const totalRevenue = useMemo(
    () => revenueData.reduce((a, b) => a + (b.revenue || 0), 0),
    [revenueData],
  );

  const totalJobs = useMemo(
    () => jobsData.reduce((a, b) => a + (b.jobs || 0), 0),
    [jobsData],
  );

  const revenueGrowth = useMemo(() => {
    if (revenueData.length < 2) return 0;
    const mid = Math.floor(revenueData.length / 2);
    const first = revenueData.slice(0, mid).reduce((a, b) => a + b.revenue, 0);
    const second = revenueData.slice(mid).reduce((a, b) => a + b.revenue, 0);
    if (first === 0) return 0;
    return ((second - first) / first) * 100;
  }, [revenueData]);

  const formatLabel = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });

  const reduceLabels = (data: Array<{ day: string }>) =>
    data.map((d, i) =>
      i % Math.ceil(data.length / 6) === 0 ? formatLabel(d.day) : "",
    );

  const revenueLabels =
    revenueData.length > 0 ? reduceLabels(revenueData) : ["-"];
  const revenueValues =
    revenueData.length > 0 ? revenueData.map((d) => d.revenue) : [0];

  const jobLabels = jobsData.length > 0 ? reduceLabels(jobsData) : ["-"];
  const jobValues = jobsData.length > 0 ? jobsData.map((d) => d.jobs) : [0];

  const isRevenueZero = revenueValues.every((v) => v === 0);
  const isJobsZero = jobValues.every((v) => v === 0);

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      backgroundColor: theme.colors.bgApp,
      padding: theme.spacing.lg,
    }),
    [theme.colors.bgApp, theme.spacing.lg],
  );

  const centerStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const headerRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    }),
    [],
  );

  const toggleRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const kpiRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
    }),
    [theme.spacing.lg, theme.spacing.md],
  );

  const sectionTitleStyle = useMemo(
    () => ({
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.sm,
      color: theme.colors.textPrimary,
    }),
    [theme.spacing.xl, theme.spacing.sm, theme.colors.textPrimary],
  );

  const chartStyle = useMemo(
    () => ({
      borderRadius: theme.radius.xl,
    }),
    [theme.radius.xl],
  );

  const emptyChartStyle = useMemo<ViewStyle>(
    () => ({
      height: 220,
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radius.xl,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
    }),
    [theme.colors.bgSurface, theme.colors.borderDefault, theme.radius.xl],
  );

  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: theme.colors.bgSurface,
      backgroundGradientTo: theme.colors.bgSurface,
      color: () => theme.colors.primary,
      labelColor: () => theme.colors.textSecondary,
      strokeWidth: 2,
      decimalPlaces: 0,
    }),
    [theme],
  );

  const jobsChartConfig = useMemo(
    () => ({
      backgroundGradientFrom: theme.colors.bgSurface,
      backgroundGradientTo: theme.colors.bgSurface,
      color: () => theme.colors.success,
      labelColor: () => theme.colors.textSecondary,
      strokeWidth: 2,
      decimalPlaces: 0,
    }),
    [theme],
  );

  if (loading) {
    return (
      <AppScreen centerContent>
        <View style={centerStyle}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <AppText variant="bodySm" tone="secondary">
            Loading analytics...
          </AppText>
        </View>
      </AppScreen>
    );
  }

  if (!summaryMeta && !revenueData.length && !jobsData.length && error) {
    return (
      <AppScreen centerContent>
        <EmptyState title="Analytics unavailable" message={error} />
      </AppScreen>
    );
  }

  return (
    <AppScreen padded={false} keyboardAvoiding={false}>
      <ScrollView
        style={containerStyle}
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
        showsVerticalScrollIndicator={false}
      >
        <View style={headerRowStyle}>
          <View>
            <AppText variant="h1" weight="900">
              Admin Analytics
            </AppText>
            <AppText variant="caption" tone="success" weight="700">
              ● Live
            </AppText>
          </View>

          <View style={toggleRowStyle}>
            <ToggleBtn
              active={range === 7}
              label="7D"
              onPress={() => setRange(7)}
            />
            <ToggleBtn
              active={range === 30}
              label="30D"
              onPress={() => setRange(30)}
            />
          </View>
        </View>

        {error ? (
          <View style={{ marginTop: theme.spacing.md }}>
            <InlineAlert tone="error" message={error} />
          </View>
        ) : null}

        <View style={kpiRowStyle}>
          <KpiCard
            label="Revenue"
            value={`UGX ${formatNumber(totalRevenue)}`}
            growth={revenueGrowth}
          />
          <KpiCard label="Jobs Posted" value={formatNumber(totalJobs)} />
        </View>

        <View style={kpiRowStyle}>
          <KpiCard
            label="Today Revenue"
            value={`UGX ${formatNumber(summaryMeta?.today_revenue || 0)}`}
          />
          <KpiCard
            label="Active Premium Users"
            value={formatNumber(summaryMeta?.active_premium_users || 0)}
          />
        </View>

        <AppText variant="labelLg" weight="800" style={sectionTitleStyle}>
          Revenue Trend
        </AppText>
        {isRevenueZero ? (
          <EmptyChart
            message="No revenue data in selected period."
            style={emptyChartStyle}
          />
        ) : (
          <LineChart
            data={{
              labels: revenueLabels,
              datasets: [{ data: revenueValues }],
            }}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            withDots={range === 7}
            withVerticalLines={false}
            withInnerLines={false}
            withOuterLines
            fromZero
            style={chartStyle}
          />
        )}

        <AppText variant="labelLg" weight="800" style={sectionTitleStyle}>
          Job Growth
        </AppText>
        {isJobsZero ? (
          <EmptyChart
            message="No job data in selected period."
            style={emptyChartStyle}
          />
        ) : (
          <LineChart
            data={{
              labels: jobLabels,
              datasets: [{ data: jobValues }],
            }}
            width={screenWidth - 40}
            height={220}
            chartConfig={jobsChartConfig}
            withDots={range === 7}
            withVerticalLines={false}
            withInnerLines={false}
            withOuterLines
            fromZero
            style={chartStyle}
          />
        )}
      </ScrollView>
    </AppScreen>
  );
}

function ToggleBtn({
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
      style={{
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 6,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: active ? theme.colors.primary : theme.colors.borderDefault,
        backgroundColor: active ? theme.colors.primary : theme.colors.bgSurface,
      }}
    >
      <AppText
        variant="caption"
        weight="800"
        style={{
          color: active ? theme.colors.textInverse : theme.colors.textPrimary,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function KpiCard({
  label,
  value,
  growth,
}: {
  label: string;
  value: string;
  growth?: number;
}) {
  const { theme } = useTheme();
  const positive = growth !== undefined && growth >= 0;

  return (
    <AppCard variant="elevated" padding="lg" style={{ flex: 1 }}>
      <AppText variant="caption" weight="700" tone="secondary">
        {label}
      </AppText>

      <View style={{ marginTop: 6 }}>
        <AppText variant="h3" weight="900">
          {value}
        </AppText>
      </View>

      {growth !== undefined ? (
        <AppText
          variant="caption"
          weight="700"
          style={{
            marginTop: 4,
            color: positive ? theme.colors.success : theme.colors.error,
          }}
        >
          {positive ? "↑" : "↓"} {Math.abs(growth).toFixed(1)}%
        </AppText>
      ) : null}
    </AppCard>
  );
}

function EmptyChart({ message, style }: { message: string; style: ViewStyle }) {
  return (
    <View style={style}>
      <AppText variant="bodySm" tone="secondary" weight="600">
        {message}
      </AppText>
    </View>
  );
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString();
}
