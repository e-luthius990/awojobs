import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ViewStyle,
} from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { supabase } from "../../core/supabase";
import { useSession } from "../../state/useSession";
import { setPendingIntent } from "../../intent/intent.store";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppHeader } from "../../ui/AppHeader";
import { AppText } from "../../ui/AppText";
import { AppCard } from "../../ui/AppCard";
import { AppButton } from "../../ui/AppButton";
import { InlineAlert } from "../../ui/InlineAlert";
import { StatusBadge } from "../../ui/StatusBadge";
import { SkeletonCard } from "../../ui/Skeleton";

type Plan = {
  id: string;
  label: string;
  price: number;
  purpose: "premium_1_day" | "premium_7_days" | "premium_30_days";
  popular?: boolean;
};

type UserRole = "job_seeker" | "employer" | "moderator" | "super_admin" | null;

type PremiumRecord = {
  expires_at: string | null;
  status: string | null;
} | null;

type PremiumIntentResponse = {
  intent_id?: string | null;
  payment_reference?: string | null;
  error?: string | null;
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
      const [
        { data: profile, error: profileError },
        { data: premium, error: premiumError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle(),
        supabase
          .from("job_seeker_premium")
          .select("expires_at, status")
          .eq("user_id", session.user.id)
          .maybeSingle(),
      ]);

      if (profileError || premiumError) {
        throw profileError ?? premiumError;
      }

      setRole((profile?.role as UserRole) ?? null);
      setPremiumRecord((premium as PremiumRecord) ?? null);
    } catch {
      setRole(null);
      setPremiumRecord(null);
      setError("We could not load your premium status right now.");
    } finally {
      setChecking(false);
    }
  }, [session]);

  useEffect(() => {
    void fetchPremium();
  }, [fetchPremium]);

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

      if (!session) {
        setPendingIntent({
          intent: "premium",
          returnTo: "Premium",
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

      if (role !== "job_seeker") {
        setError(
          "Premium nationwide browsing is only available to job seekers.",
        );
        return;
      }

      try {
        setLoadingPlan(plan.id);
        setError(null);

        const { data, error } = await supabase.functions.invoke(
          "create_premium_intent",
          {
            body: { purpose: plan.purpose },
          },
        );

        if (error) throw error;

        const payload = (data ?? {}) as PremiumIntentResponse;

        if (payload.error) {
          throw new Error(payload.error);
        }

        if (!payload.intent_id && !payload.payment_reference) {
          throw new Error("Premium payment session could not be created.");
        }

        navigation.navigate("PremiumPayment", {
          purpose: plan.purpose,
          planLabel: plan.label,
          amount: plan.price,
          intentId: payload.intent_id ?? null,
          paymentReference: payload.payment_reference ?? null,
        });
      } catch (e: any) {
        setError(e?.message ?? "Unable to continue. Please try again.");
      } finally {
        setLoadingPlan(null);
      }
    },
    [checking, loadingPlan, navigation, role, session],
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
