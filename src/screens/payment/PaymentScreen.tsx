import React, { useMemo, useState, useCallback, type ViewStyle } from "react";
import { View } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { supabase } from "../../core/supabase";
import type { PostJobStackParamList } from "../../navigation/PostJobNavigator";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppHeader } from "../../ui/AppHeader";
import { AppText } from "../../ui/AppText";
import { AppCard } from "../../ui/AppCard";
import { AppButton } from "../../ui/AppButton";
import { InlineAlert } from "../../ui/InlineAlert";
import { StatusBadge } from "../../ui/StatusBadge";

type RouteProps = RouteProp<PostJobStackParamList, "Payment">;
type NavProps = NativeStackNavigationProp<PostJobStackParamList, "Payment">;

type Sponsorship =
  | null
  | "sponsored_day"
  | "sponsored_week"
  | "sponsored_month";

type PaymentMode = "create" | "renew";

const PRICES = {
  job_post: 2000,
  sponsored_day: 5000,
  sponsored_week: 10000,
  sponsored_month: 25000,
} as const;

const SPONSOR_OPTIONS: {
  value: Exclude<Sponsorship, null>;
  label: string;
  description: string;
  price: number;
  popular?: boolean;
}[] = [
  {
    value: "sponsored_day",
    label: "1 Day Boost",
    description: "Short-term extra visibility in the feed.",
    price: PRICES.sponsored_day,
  },
  {
    value: "sponsored_week",
    label: "1 Week Boost",
    description: "Best balance for stronger visibility and response volume.",
    price: PRICES.sponsored_week,
    popular: true,
  },
  {
    value: "sponsored_month",
    label: "1 Month Boost",
    description: "Extended visibility for hard-to-fill or ongoing roles.",
    price: PRICES.sponsored_month,
  },
];

type CreateJobIntentResponse = {
  intent_id?: string | null;
  payment_reference?: string | null;
  amount?: number | null;
  job_id?: string | null;
  error?: string | null;
  message?: string | null;
};

function formatCurrency(amount: number) {
  return `UGX ${amount.toLocaleString()}`;
}

function isValidMode(value: unknown): value is PaymentMode {
  return value === "create" || value === "renew";
}

function createIdempotencyKey(draftId: string, mode: PaymentMode) {
  return `${draftId}:${mode}:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2, 14)}`;
}

export default function PaymentScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProps>();
  const { theme } = useTheme();

  const rawDraftId = route.params?.draftId;
  const rawMode = route.params?.mode;

  const draftId = typeof rawDraftId === "string" ? rawDraftId : "";
  const mode: PaymentMode = isValidMode(rawMode) ? rawMode : "create";

  const [sponsorship, setSponsorship] = useState<Sponsorship>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [idempotencyKey] = useState(() => createIdempotencyKey(draftId, mode));

  const total = useMemo(() => {
    const base = PRICES.job_post;
    return base + (sponsorship ? PRICES[sponsorship] : 0);
  }, [sponsorship]);

  const selectedBoost = useMemo(
    () =>
      SPONSOR_OPTIONS.find((option) => option.value === sponsorship) ?? null,
    [sponsorship],
  );

  const payButtonLabel = mode === "renew" ? "Pay & Renew" : "Pay & Publish";

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

  const boostListStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const boostCardContentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
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

  const proceedToPay = useCallback(async () => {
    if (loading) return;

    if (!draftId) {
      setError("Missing draft id.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: invokeError } = await supabase.functions.invoke(
        "create_job_intent",
        {
          body: {
            draft_id: draftId,
            sponsorship,
            mode,
            idempotency_key: idempotencyKey,
          },
        },
      );

      if (invokeError) {
        throw invokeError;
      }

      const payload = (data ?? {}) as CreateJobIntentResponse;

      if (payload.error) {
        throw new Error(payload.error);
      }

      if (typeof payload.intent_id !== "string" || !payload.intent_id.trim()) {
        throw new Error(payload.message ?? "Invalid payment response.");
      }

      navigation.replace("PaymentPending", {
        intentId: payload.intent_id,
        jobId:
          typeof payload.job_id === "string" && payload.job_id.trim()
            ? payload.job_id
            : draftId,
        flow: "job_post",
      });
    } catch (e: any) {
      setError(e?.message ?? "Unable to process payment.");
    } finally {
      setLoading(false);
    }
  }, [draftId, idempotencyKey, loading, mode, navigation, sponsorship]);

  return (
    <AppScreen scroll>
      <View style={contentStyle}>
        <AppHeader
          title="Payment"
          subtitle={mode === "create" ? "Publishing new job" : "Renewing job"}
          onBackPress={() => navigation.goBack()}
        />

        {error ? <InlineAlert tone="error" message={error} /> : null}

        <AppCard variant="elevated" padding="lg">
          <View style={heroStyle}>
            <StatusBadge label="Review" tone="info" />
            <AppText variant="h3">Review payment</AppText>
            <AppText variant="bodySm" tone="secondary">
              Confirm your posting fee and choose whether you want extra
              visibility.
            </AppText>
          </View>
        </AppCard>

        <InlineAlert
          tone="info"
          title="Before your job goes live"
          message="Your job will go live only after payment is successfully confirmed."
        />

        <AppCard variant="elevated" padding="lg">
          <View style={sectionStyle}>
            <AppText variant="titleLg">Base posting fee</AppText>

            <View style={rowStyle}>
              <View style={{ flex: 1 }}>
                <AppText variant="body">Job posting</AppText>
                <AppText variant="bodySm" tone="secondary">
                  Required to publish or renew this job.
                </AppText>
              </View>

              <View style={priceBlockStyle}>
                <AppText variant="title">
                  {formatCurrency(PRICES.job_post)}
                </AppText>
              </View>
            </View>
          </View>
        </AppCard>

        <AppCard variant="elevated" padding="lg">
          <View style={sectionStyle}>
            <View style={rowStyle}>
              <View style={{ flex: 1 }}>
                <AppText variant="titleLg">Boost visibility</AppText>
                <AppText variant="bodySm" tone="secondary">
                  Optional promotion to help more applicants discover your job.
                </AppText>
              </View>

              {selectedBoost ? (
                <StatusBadge label="Selected" tone="sponsored" />
              ) : null}
            </View>

            <View style={boostListStyle}>
              {SPONSOR_OPTIONS.map((option) => {
                const active = sponsorship === option.value;

                return (
                  <AppCard
                    key={option.value}
                    variant={active ? "sponsored" : "default"}
                    padding="lg"
                    onPress={() =>
                      setSponsorship((current) =>
                        current === option.value ? null : option.value,
                      )
                    }
                  >
                    <View style={boostCardContentStyle}>
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
                            {formatCurrency(option.price)}
                          </AppText>
                        </View>
                      </View>
                    </View>
                  </AppCard>
                );
              })}
            </View>
          </View>
        </AppCard>

        <AppCard variant="premium" padding="lg">
          <View style={sectionStyle}>
            <StatusBadge label="Payment Summary" tone="premium" />

            <View style={totalRowStyle}>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="titleLg">Total</AppText>
                <AppText variant="bodySm" tone="secondary">
                  Posting fee
                </AppText>

                {selectedBoost ? (
                  <AppText variant="bodySm" tone="secondary">
                    + {selectedBoost.label}
                  </AppText>
                ) : (
                  <AppText variant="bodySm" tone="secondary">
                    No optional boost selected
                  </AppText>
                )}
              </View>

              <View style={priceBlockStyle}>
                <AppText variant="h2">{formatCurrency(total)}</AppText>
              </View>
            </View>
          </View>
        </AppCard>

        <View style={footerActionsStyle}>
          <AppButton
            title={payButtonLabel}
            onPress={proceedToPay}
            loading={loading}
            disabled={loading || !draftId}
            variant="primary"
          />

          {selectedBoost ? (
            <InlineAlert
              tone="success"
              message={`${selectedBoost.label} has been added to this payment.`}
            />
          ) : (
            <InlineAlert
              tone="info"
              message="You can continue with only the standard posting fee if you do not need extra promotion."
            />
          )}
        </View>
      </View>
    </AppScreen>
  );
}
