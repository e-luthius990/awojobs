import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ViewStyle,
} from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { supabase } from "../../core/supabase";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppHeader } from "../../ui/AppHeader";
import { AppCard } from "../../ui/AppCard";
import { AppText } from "../../ui/AppText";
import { EmptyState } from "../../ui/EmptyState";
import { InlineAlert } from "../../ui/InlineAlert";
import { StatusBadge } from "../../ui/StatusBadge";
import { SkeletonCard } from "../../ui/Skeleton";

/* --------------------------------------------- */
/* TYPES */
/* --------------------------------------------- */

type PaymentStatus =
  | "initiated"
  | "pending"
  | "confirmed"
  | "failed"
  | "expired";

type PaymentType = "job_post" | "sponsor_upgrade";

type Payment = {
  id: string;
  status: PaymentStatus;
  amount_ugx: number;
  payment_type: PaymentType;
  created_at: string;
  job_id: string | null;
  job: {
    title: string;
  } | null;
};

/* --------------------------------------------- */
/* HELPERS */
/* --------------------------------------------- */

function formatStatus(status: PaymentStatus) {
  switch (status) {
    case "confirmed":
      return "Paid";
    case "initiated":
    case "pending":
      return "Processing";
    case "failed":
      return "Failed";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

function mapStatusTone(
  status: PaymentStatus,
): React.ComponentProps<typeof StatusBadge>["tone"] {
  switch (status) {
    case "confirmed":
      return "success";
    case "initiated":
    case "pending":
      return "warning";
    case "failed":
      return "error";
    case "expired":
      return "default";
    default:
      return "default";
  }
}

function formatPaymentType(type: PaymentType) {
  return type === "job_post" ? "Job Post" : "Sponsor Upgrade";
}

function QuickStat({ label, value }: { label: string; value: number }) {
  return (
    <AppCard variant="elevated" padding="lg" style={{ flex: 1 }}>
      <View style={{ gap: 4 }}>
        <AppText variant="caption" tone="secondary" uppercase>
          {label}
        </AppText>
        <AppText variant="h2">{value}</AppText>
      </View>
    </AppCard>
  );
}

/* --------------------------------------------- */
/* SCREEN */
/* --------------------------------------------- */

export default function PaymentsHistoryScreen() {
  const { theme } = useTheme();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("employer_payments")
        .select(
          `
          id,
          status,
          amount_ugx,
          payment_type,
          created_at,
          job_id,
          job:jobs (
            title
          )
        `,
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setPayments((data ?? []) as Payment[]);
    } catch {
      setError("Could not load payment history.");
      if (!silent) {
        setPayments([]);
      }
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("payments-history")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "employer_payments",
        },
        () => {
          void load(true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
  }, [load]);

  const counts = useMemo(() => {
    let paid = 0;
    let processing = 0;
    let failed = 0;

    for (const payment of payments) {
      if (payment.status === "confirmed") paid += 1;
      else if (payment.status === "pending" || payment.status === "initiated") {
        processing += 1;
      } else if (payment.status === "failed" || payment.status === "expired") {
        failed += 1;
      }
    }

    return {
      total: payments.length,
      paid,
      processing,
      failed,
    };
  }, [payments]);

  const listContentStyle = useMemo<ViewStyle>(
    () => ({
      paddingBottom: theme.spacing.xxxl,
      paddingHorizontal: theme.spacing.screenX,
      paddingTop: theme.spacing.md,
    }),
    [theme.spacing.xxxl, theme.spacing.screenX, theme.spacing.md],
  );

  const headerWrapStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.lg,
      gap: theme.spacing.lg,
    }),
    [theme.spacing.lg],
  );

  const heroWrapStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const statRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const itemWrapStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const cardContentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const topRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const titleWrapStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const metaBlockStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.xxs,
    }),
    [theme.spacing.xxs],
  );

  const loaderWrapStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  if (loading) {
    return (
      <AppScreen scroll>
        <View style={loaderWrapStyle}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      </AppScreen>
    );
  }

  if (error && payments.length === 0) {
    return (
      <AppScreen centerContent>
        <EmptyState title="Payments unavailable" message={error} />
      </AppScreen>
    );
  }

  if (payments.length === 0) {
    return (
      <AppScreen centerContent>
        <EmptyState
          title="No payments yet"
          message="Your job posting and sponsor payments will appear here."
        />
      </AppScreen>
    );
  }

  const headerComponent = (
    <View style={headerWrapStyle}>
      <AppHeader
        title="Payments"
        subtitle="Track posting and sponsorship payment activity"
      />

      <AppCard variant="elevated" padding="lg">
        <View style={heroWrapStyle}>
          <StatusBadge label="Overview" tone="info" />
          <AppText variant="h3">Payment history</AppText>
          <AppText variant="bodySm" tone="secondary">
            Review confirmed, processing, and failed payments for your employer
            account.
          </AppText>
        </View>
      </AppCard>

      <View style={statRowStyle}>
        <QuickStat label="Total" value={counts.total} />
        <QuickStat label="Paid" value={counts.paid} />
      </View>

      {counts.processing > 0 ? (
        <InlineAlert
          tone="info"
          title="Payments processing"
          message={`${counts.processing} payment${counts.processing > 1 ? "s are" : " is"} still being processed.`}
        />
      ) : null}

      {counts.failed > 0 ? (
        <InlineAlert
          tone="warning"
          title="Some payments need attention"
          message={`${counts.failed} payment${counts.failed > 1 ? "s have" : " has"} failed or expired.`}
        />
      ) : null}

      {error ? <InlineAlert tone="error" message={error} /> : null}
    </View>
  );

  return (
    <AppScreen padded={false} keyboardAvoiding={false}>
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={listContentStyle}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={headerComponent}
        renderItem={({ item }) => (
          <View style={itemWrapStyle}>
            <AppCard variant="elevated" padding="lg">
              <View style={cardContentStyle}>
                <View style={topRowStyle}>
                  <View style={titleWrapStyle}>
                    <AppText variant="title" numberOfLines={2}>
                      {item.job?.title ?? "Job Payment"}
                    </AppText>
                    <AppText variant="bodySm" tone="secondary">
                      {formatPaymentType(item.payment_type)}
                    </AppText>
                  </View>

                  <StatusBadge
                    label={formatStatus(item.status)}
                    tone={mapStatusTone(item.status)}
                  />
                </View>

                <View style={metaBlockStyle}>
                  <AppText variant="bodySm" weight="700">
                    UGX {(item.amount_ugx ?? 0).toLocaleString()}
                  </AppText>

                  <AppText variant="caption" tone="tertiary">
                    {new Date(item.created_at).toLocaleDateString("en-UG")}
                  </AppText>
                </View>
              </View>
            </AppCard>
          </View>
        )}
      />
    </AppScreen>
  );
}
