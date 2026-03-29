import React, { useMemo, useState, useCallback, type ViewStyle } from "react";
import { View } from "react-native";
import { supabase } from "../../core/supabase";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppHeader } from "../../ui/AppHeader";
import { AppText } from "../../ui/AppText";
import { AppCard } from "../../ui/AppCard";
import { AppButton } from "../../ui/AppButton";
import { InlineAlert } from "../../ui/InlineAlert";
import { StatusBadge } from "../../ui/StatusBadge";

type Sponsorship = "sponsored_day" | "sponsored_week" | "sponsored_month";

type SponsorIntentResponse = {
  intent_id?: string | null;
  payment_reference?: string | null;
  amount?: number | null;
  job_id?: string | null;
  error?: string | null;
  code?: string | null;
  message?: string | null;
};

const DISPLAY_PRICES: Record<Sponsorship, number> = {
  sponsored_day: 5000,
  sponsored_week: 10000,
  sponsored_month: 25000,
};

const OPTIONS: {
  value: Sponsorship;
  label: string;
  description: string;
  popular?: boolean;
}[] = [
  {
    value: "sponsored_day",
    label: "1 Day Boost",
    description: "Good for urgent hiring and short-term visibility.",
  },
  {
    value: "sponsored_week",
    label: "1 Week Boost",
    description: "Best balance for stronger reach and better applicant flow.",
    popular: true,
  },
  {
    value: "sponsored_month",
    label: "1 Month Boost",
    description: "Maximum visibility for harder-to-fill or ongoing roles.",
  },
];

function formatCurrency(amount: number) {
  return `UGX ${amount.toLocaleString()}`;
}

export default function SponsorPaymentScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const jobId: string | undefined = route?.params?.jobId;

  const [selected, setSelected] = useState<Sponsorship | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = selected ? DISPLAY_PRICES[selected] : 0;

  const selectedPlan = useMemo(
    () => OPTIONS.find((option) => option.value === selected) ?? null,
    [selected],
  );

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    }),
    [theme.spacing.lg, theme.spacing.xxxl],
  );

  const heroStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const sectionStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const optionListStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const optionCardContentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const rowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const priceBlockStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "flex-end",
    }),
    [],
  );

  const totalRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const footerActionsStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const makeIdempotencyKey = useCallback(() => {
    if (!jobId) {
      throw new Error("Missing job id.");
    }

    return `${jobId}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}_${Math.random().toString(36).slice(2)}`;
  }, [jobId]);

  const proceed = useCallback(async () => {
    if (!jobId) {
      setError("Invalid job reference.");
      return;
    }

    if (!selected) {
      setError("Select a boost plan before continuing.");
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke(
        "create_job_sponsor_payment_intent",
        {
          body: {
            job_id: jobId,
            sponsorship: selected,
            idempotency_key: makeIdempotencyKey(),
          },
        },
      );

      if (error) {
        throw new Error(error.message || "Could not start payment.");
      }

      const payload = (data ?? {}) as SponsorIntentResponse;

      if (payload.error) {
        throw new Error(payload.error);
      }

      if (!payload.intent_id) {
        throw new Error(payload.message ?? "Invalid payment response.");
      }

      navigation.replace("PaymentPending", {
        jobId,
        flow: "job_sponsor",
        intentId: payload.intent_id,
        paymentReference: payload.payment_reference ?? null,
        amount: payload.amount ?? null,
      });
    } catch (e: any) {
      setError(e?.message ?? "Could not start payment. Try again.");
    } finally {
      setLoading(false);
    }
  }, [jobId, loading, makeIdempotencyKey, navigation, selected]);

  if (!jobId) {
    return (
      <AppScreen centerContent>
        <AppCard variant="muted" padding="lg">
          <View style={{ gap: 8 }}>
            <AppText variant="titleLg" align="center">
              Invalid job reference
            </AppText>
            <AppText variant="bodySm" tone="secondary" align="center">
              We could not identify the job you want to sponsor.
            </AppText>
          </View>
        </AppCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={contentStyle}>
        <AppHeader
          title="Boost Visibility"
          subtitle="Promote this job to reach more job seekers."
          onBackPress={() => navigation.goBack()}
        />

        {error ? <InlineAlert tone="error" message={error} /> : null}

        <AppCard variant="elevated" padding="lg">
          <View style={heroStyle}>
            <StatusBadge label="Sponsorship" tone="sponsored" />
            <AppText variant="h3">Sponsor this job</AppText>
            <AppText variant="bodySm" tone="secondary">
              Sponsored jobs appear more prominently and can attract faster
              attention from job seekers.
            </AppText>
          </View>
        </AppCard>

        <View style={optionListStyle}>
          {OPTIONS.map((option) => {
            const active = selected === option.value;

            return (
              <AppCard
                key={option.value}
                variant={active ? "sponsored" : "default"}
                padding="lg"
                onPress={() => {
                  setSelected(option.value);
                  if (error) setError(null);
                }}
              >
                <View style={optionCardContentStyle}>
                  <View style={rowStyle}>
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: theme.spacing.xs,
                          marginBottom: 4,
                          flexWrap: "wrap",
                        }}
                      >
                        <AppText variant="title">{option.label}</AppText>
                        {option.popular ? (
                          <StatusBadge label="Popular" tone="premium" />
                        ) : null}
                        {active ? (
                          <StatusBadge label="Selected" tone="sponsored" />
                        ) : null}
                      </View>

                      <AppText variant="bodySm" tone="secondary">
                        {option.description}
                      </AppText>
                    </View>

                    <View style={priceBlockStyle}>
                      <AppText variant="title">
                        {formatCurrency(DISPLAY_PRICES[option.value])}
                      </AppText>
                    </View>
                  </View>
                </View>
              </AppCard>
            );
          })}
        </View>

        <AppCard variant="premium" padding="lg">
          <View style={sectionStyle}>
            <StatusBadge label="Payment Summary" tone="premium" />

            <View style={totalRowStyle}>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="titleLg">Total</AppText>
                <AppText variant="bodySm" tone="secondary">
                  {selectedPlan
                    ? `${selectedPlan.label} selected`
                    : "No boost plan selected yet"}
                </AppText>
              </View>

              <View style={priceBlockStyle}>
                <AppText variant="h2">
                  {selected ? formatCurrency(total) : "UGX 0"}
                </AppText>
              </View>
            </View>
          </View>
        </AppCard>

        <View style={footerActionsStyle}>
          <AppButton
            title="Pay & Boost"
            onPress={proceed}
            loading={loading}
            disabled={loading || !selected}
            variant="primary"
          />

          {!selected ? (
            <InlineAlert
              tone="info"
              message="Select a boost plan before continuing to payment."
            />
          ) : (
            <InlineAlert
              tone="success"
              message={`${selectedPlan?.label ?? "Selected plan"} will be used for this sponsorship payment.`}
            />
          )}
        </View>
      </View>
    </AppScreen>
  );
}
