import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type ViewStyle,
} from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { useSession } from "../../state/useSession";
import {
  setPendingIntent,
  peekPendingIntent,
  clearPendingIntent,
} from "../../intent/intent.store";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppHeader } from "../../ui/AppHeader";
import { AppText } from "../../ui/AppText";
import { AppCard } from "../../ui/AppCard";
import { AppButton } from "../../ui/AppButton";
import { InlineAlert } from "../../ui/InlineAlert";
import { StatusBadge } from "../../ui/StatusBadge";
import { SkeletonCard } from "../../ui/Skeleton";

import {
  createPremiumIntent,
  fetchPremiumStatus,
  type PremiumPurpose,
  type PremiumRecord,
  type UserRole,
} from "../../services/premium.intent.service";

type Plan = {
  id: string;
  label: string;
  price: number;
  purpose: PremiumPurpose;
  popular?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "daily",
    label: "1 Day Access",
    price: 2000,
    purpose: "premium_1_day",
  },
  {
    id: "weekly",
    label: "7 Days Access",
    price: 5000,
    purpose: "premium_7_days",
    popular: true,
  },
  {
    id: "monthly",
    label: "30 Days Access",
    price: 20000,
    purpose: "premium_30_days",
  },
];

function formatDaysRemaining(daysRemaining: number) {
  if (daysRemaining <= 1) return "Expires tomorrow";
  return `${daysRemaining} days remaining`;
}

function formatCurrency(amount: number) {
  return `UGX ${amount.toLocaleString()}`;
}

export default function PremiumScreen() {
  const navigation = useNavigation<any>();
  const { session } = useSession();
  const { theme } = useTheme();

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [premiumRecord, setPremiumRecord] = useState<PremiumRecord>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [error, setError] = useState<string | null>(null);

  const resumeAttemptedRef = useRef(false);

  const fetchPremium = useCallback(async () => {
    if (!session) {
      setPremiumRecord(null);
      setRole(null);
      setError(null);
      setChecking(false);
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const result = await fetchPremiumStatus(session.user.id);

      if (!result.ok) {
        setRole(null);
        setPremiumRecord(null);
        setError(result.error.message);
        return;
      }

      setRole(result.data.role);
      setPremiumRecord(result.data.premiumRecord);
    } finally {
      setChecking(false);
    }
  }, [session]);

  useEffect(() => {
    void fetchPremium();
  }, [fetchPremium]);

  useEffect(() => {
    if (!session) {
      resumeAttemptedRef.current = false;
    }
  }, [session]);

  const createPremiumIntentAndNavigate = useCallback(
    async (plan: Pick<Plan, "purpose" | "label" | "price">) => {
      const result = await createPremiumIntent(plan.purpose);

      if (!result.ok) {
        setError(result.error.message);
        return false;
      }

      navigation.navigate("PremiumPayment", {
        purpose: plan.purpose,
        planLabel: plan.label,
        amount: plan.price,
        intentId: result.data.intentId,
        paymentReference: result.data.paymentReference,
      });

      return true;
    },
    [navigation],
  );

  useEffect(() => {
    if (!session || checking) return;
    if (resumeAttemptedRef.current) return;
    if (role !== "job_seeker") return;

    let cancelled = false;

    const resumePremiumUpgrade = async () => {
      const pending = await peekPendingIntent();

      if (!pending || pending.kind !== "premium_upgrade") {
        return;
      }

      resumeAttemptedRef.current = true;

      const selectedPlan = pending.payload.plan;

      const navigated = await createPremiumIntentAndNavigate({
        purpose: selectedPlan.purpose,
        label: selectedPlan.label,
        price: selectedPlan.amount,
      });

      if (!cancelled && navigated) {
        await clearPendingIntent();
      }
    };

    void resumePremiumUpgrade();

    return () => {
      cancelled = true;
    };
  }, [session, checking, role, createPremiumIntentAndNavigate]);

  const now = Date.now();

  const isActive =
    !!premiumRecord &&
    premiumRecord.status === "confirmed" &&
    !!premiumRecord.expires_at &&
    new Date(premiumRecord.expires_at).getTime() > now;

  const daysRemaining = isActive
    ? Math.ceil(
        (new Date(premiumRecord.expires_at as string).getTime() - now) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  const isExpired = !!session && role === "job_seeker" && !isActive;

  const handlePurchase = useCallback(
    async (plan: Plan) => {
      if (loadingPlan || checking) return;

      setError(null);

      if (!session) {
        await setPendingIntent({
          kind: "premium_upgrade",
          payload: {
            source: "guest_upgrade",
            plan: {
              purpose: plan.purpose,
              label: plan.label,
              amount: plan.price,
            },
          },
        });

        navigation.navigate("AuthModal", {
          screen: "Register",
          params: {
            forcedRole: "job_seeker",
            intent: "premium_upgrade",
          },
        });

        return;
      }

      if (role === null) {
        setError(
          "We are still finalizing your account. Please wait a moment and try again.",
        );
        return;
      }

      if (role !== "job_seeker") {
        setError(
          "Premium nationwide browsing is only available to job seekers.",
        );
        return;
      }

      setLoadingPlan(plan.id);

      try {
        await createPremiumIntentAndNavigate({
          purpose: plan.purpose,
          label: plan.label,
          price: plan.price,
        });
      } finally {
        setLoadingPlan(null);
      }
    },
    [
      checking,
      loadingPlan,
      navigation,
      role,
      session,
      createPremiumIntentAndNavigate,
    ],
  );

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    }),
    [theme.spacing.lg, theme.spacing.xxxl],
  );

  const activeCardStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const featureListStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const benefitRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const planListStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const planCardContentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const priceWrapStyle = useMemo<ViewStyle>(
    () => ({
      gap: 4,
    }),
    [],
  );

  const loaderWrapStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  if (checking) {
    return (
      <AppScreen scroll>
        <View style={loaderWrapStyle}>
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </View>
      </AppScreen>
    );
  }

  if (session && role && role !== "job_seeker") {
    return (
      <AppScreen scroll>
        <View style={contentStyle}>
          <AppHeader title="Premium" />
          <InlineAlert
            tone="warning"
            title="Premium unavailable"
            message="Premium nationwide browsing is available to job seekers only."
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={contentStyle}>
        <AppHeader
          title="Premium"
          subtitle="Unlock nationwide job browsing across Uganda"
        />

        {error ? <InlineAlert tone="error" message={error} /> : null}

        {isActive ? (
          <AppCard variant="premium" padding="lg">
            <View style={activeCardStyle}>
              <StatusBadge label="Premium Active" tone="premium" />
              <AppText variant="titleLg">Nationwide access unlocked</AppText>
              <AppText variant="bodySm" tone="secondary">
                {formatDaysRemaining(daysRemaining)}
              </AppText>
            </View>
          </AppCard>
        ) : (
          <>
            {isExpired ? (
              <InlineAlert
                tone="warning"
                title="Premium expired"
                message="Renew to restore nationwide browsing and continue exploring jobs across Uganda."
              />
            ) : null}

            {!session ? (
              <InlineAlert
                tone="info"
                title="Register first"
                message="Create a job seeker account first, then continue to premium payment."
              />
            ) : null}

            <AppCard variant="elevated" padding="lg">
              <View style={featureListStyle}>
                <AppText variant="titleLg">What Premium gives you</AppText>

                <View style={benefitRowStyle}>
                  <AppText variant="bodySm">•</AppText>
                  <AppText variant="bodySm" tone="secondary">
                    Nationwide job browsing beyond your district
                  </AppText>
                </View>

                <View style={benefitRowStyle}>
                  <AppText variant="bodySm">•</AppText>
                  <AppText variant="bodySm" tone="secondary">
                    More opportunities in one place
                  </AppText>
                </View>

                <View style={benefitRowStyle}>
                  <AppText variant="bodySm">•</AppText>
                  <AppText variant="bodySm" tone="secondary">
                    Faster discovery of fresh listings across Uganda
                  </AppText>
                </View>
              </View>
            </AppCard>

            <View style={planListStyle}>
              {PLANS.map((plan) => (
                <AppCard
                  key={plan.id}
                  variant={plan.popular ? "premium" : "elevated"}
                  padding="lg"
                >
                  <View style={planCardContentStyle}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: theme.spacing.sm,
                      }}
                    >
                      <View style={{ flex: 1, gap: theme.spacing.xs }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: theme.spacing.xs,
                            flexWrap: "wrap",
                          }}
                        >
                          <AppText variant="titleLg">{plan.label}</AppText>
                          {plan.popular ? (
                            <StatusBadge label="Popular" tone="premium" />
                          ) : null}
                        </View>

                        <AppText variant="bodySm" tone="secondary">
                          {plan.purpose === "premium_1_day"
                            ? "Short-term access"
                            : plan.purpose === "premium_7_days"
                              ? "Best balance of cost and flexibility"
                              : "Extended nationwide access"}
                        </AppText>
                      </View>

                      <View style={priceWrapStyle}>
                        <AppText variant="h2">
                          {formatCurrency(plan.price)}
                        </AppText>
                      </View>
                    </View>

                    <AppText variant="bodySm" tone="secondary">
                      {plan.label === "1 Day Access"
                        ? "Quick access for urgent browsing."
                        : plan.label === "7 Days Access"
                          ? "Ideal for active weekly job search."
                          : "Best for longer continuous exploration."}
                    </AppText>

                    <AppButton
                      title={
                        loadingPlan === plan.id
                          ? "Preparing..."
                          : session
                            ? "Continue to Payment"
                            : "Register & Continue"
                      }
                      onPress={() => void handlePurchase(plan)}
                      loading={loadingPlan === plan.id}
                      disabled={loadingPlan !== null}
                      variant={plan.popular ? "primary" : "secondary"}
                    />
                  </View>
                </AppCard>
              ))}
            </View>
          </>
        )}
      </View>
    </AppScreen>
  );
}
