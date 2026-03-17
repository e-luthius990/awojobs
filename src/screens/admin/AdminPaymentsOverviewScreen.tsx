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
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../../core/supabase";
import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppCard } from "../../ui/AppCard";
import { AppText } from "../../ui/AppText";
import { InlineAlert } from "../../ui/InlineAlert";
import { EmptyState } from "../../ui/EmptyState";
import { SkeletonCard } from "../../ui/Skeleton";
import { StatusBadge } from "../../ui/StatusBadge";

type Payment = {
  id: string;
  user_id: string;
  amount_ugx: number;
  status: string;
  provider_ref: string | null;
  payment_type: string;
  created_at: string;
};

type Summary = {
  confirmed_revenue: number;
  pending_count: number;
  failed_count: number;
};

export default function AdminPaymentsOverviewScreen() {
  const { theme } = useTheme();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingRef = useRef(false);

  const load = useCallback(async (silent = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    if (!silent) setLoading(true);
    setError(null);

    try {
      const [
        { data: summaryData, error: sErr },
        { data: paymentData, error: pErr },
      ] = await Promise.all([
        supabase.rpc("super_admin_payments_summary"),
        supabase
          .from("payments")
          .select(
            "id,user_id,amount_ugx,status,provider_ref,payment_type,created_at",
          )
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (sErr) throw sErr;
      if (pErr) throw pErr;

      setSummary(summaryData ?? null);
      setPayments((paymentData ?? []) as Payment[]);
    } catch {
      setError("Failed to load payments.");
      if (!silent) {
        setSummary(null);
        setPayments([]);
      }
    } finally {
      loadingRef.current = false;
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-payments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          void load(true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      void load(true);
    }, 60000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  const loadingWrapStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.md,
    }),
    [theme.spacing.lg, theme.spacing.md],
  );

  const loadingRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      paddingBottom: theme.spacing.xxxl,
      gap: theme.spacing.md,
    }),
    [theme.spacing.xxxl, theme.spacing.md],
  );

  const summaryGridStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "stretch",
      marginBottom: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const emptyWrapStyle = useMemo<ViewStyle>(
    () => ({
      paddingVertical: theme.spacing.xl,
      alignItems: "center",
    }),
    [theme.spacing.xl],
  );

  if (loading) {
    return (
      <AppScreen scroll>
        <View style={loadingWrapStyle}>
          <View style={loadingRowStyle}>
            <ActivityIndicator color={theme.colors.primary} />
            <AppText variant="bodySm" tone="secondary" weight="600">
              Loading payments...
            </AppText>
          </View>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      </AppScreen>
    );
  }

  if (!summary && payments.length === 0 && error) {
    return (
      <AppScreen centerContent>
        <EmptyState title="Payments unavailable" message={error} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.md }}>
            {error ? <InlineAlert tone="error" message={error} /> : null}

            {summary ? (
              <View style={summaryGridStyle}>
                <SummaryCard
                  label="Revenue (UGX)"
                  value={format(summary.confirmed_revenue)}
                  tone="success"
                  icon="cash-outline"
                />
                <SummaryCard
                  label="Pending"
                  value={summary.pending_count ?? 0}
                  tone="warning"
                  icon="time-outline"
                />
                <SummaryCard
                  label="Failed"
                  value={summary.failed_count ?? 0}
                  tone="error"
                  icon="alert-circle-outline"
                />
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => <PaymentCard item={item} />}
        ListEmptyComponent={
          <View style={emptyWrapStyle}>
            <EmptyState
              title="No payments found"
              message="Payment records will appear here once activity begins."
            />
          </View>
        }
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
      />
    </AppScreen>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string | number;
  tone: "success" | "warning" | "error";
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const { theme } = useTheme();

  const accentColor =
    tone === "success"
      ? theme.colors.success
      : tone === "warning"
        ? theme.colors.warning
        : theme.colors.error;

  const cardStyle = useMemo<ViewStyle>(
    () => ({
      width: "31%",
      minHeight: 96,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: accentColor,
      backgroundColor: theme.colors.bgSurface,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      justifyContent: "space-between",
    }),
    [accentColor, theme.colors.bgSurface, theme.radius.lg, theme.spacing.sm],
  );

  const iconWrapStyle = useMemo<ViewStyle>(
    () => ({
      width: 28,
      height: 28,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.bgSurfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      marginBottom: 6,
    }),
    [theme.colors.bgSurfaceElevated, theme.colors.borderDefault],
  );

  return (
    <View style={cardStyle}>
      <View style={iconWrapStyle}>
        <Ionicons name={icon} size={14} color={accentColor} />
      </View>

      <AppText
        variant="bodyLg"
        weight="800"
        style={{ color: accentColor, fontSize: 16, lineHeight: 20 }}
      >
        {value}
      </AppText>

      <AppText
        variant="caption"
        weight="700"
        style={{
          color: theme.colors.textSecondary,
          fontSize: 11,
          lineHeight: 14,
        }}
      >
        {label}
      </AppText>
    </View>
  );
}

function PaymentCard({ item }: { item: Payment }) {
  const statusTone =
    item.status === "confirmed"
      ? "success"
      : item.status === "pending" || item.status === "initiated"
        ? "warning"
        : item.status === "refunded"
          ? "default"
          : "error";

  const statusIcon =
    item.status === "confirmed"
      ? "checkmark-circle-outline"
      : item.status === "pending" || item.status === "initiated"
        ? "time-outline"
        : item.status === "refunded"
          ? "return-down-back-outline"
          : "close-circle-outline";

  const wrapStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: 12,
    }),
    [],
  );

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      gap: 8,
    }),
    [],
  );

  const topRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    }),
    [],
  );

  const leftStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      gap: 4,
    }),
    [],
  );

  return (
    <View style={wrapStyle}>
      <AppCard variant="elevated" padding="lg">
        <View style={contentStyle}>
          <View style={topRowStyle}>
            <View style={leftStyle}>
              <AppText variant="bodyLg" weight="800">
                UGX {item.amount_ugx.toLocaleString()}
              </AppText>

              <AppText variant="caption" tone="secondary">
                {new Date(item.created_at).toLocaleString()}
              </AppText>
            </View>

            <View style={{ alignSelf: "flex-start" }}>
              <StatusBadge
                label={item.status.toUpperCase()}
                tone={statusTone}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name={statusIcon} size={14} color="#888" />
            <AppText variant="caption" weight="700" tone="secondary">
              {item.payment_type}
            </AppText>
          </View>

          {item.provider_ref ? (
            <AppText variant="caption" tone="tertiary">
              Ref: {item.provider_ref}
            </AppText>
          ) : null}
        </View>
      </AppCard>
    </View>
  );
}

function format(value: number | undefined) {
  return (value ?? 0).toLocaleString();
}
