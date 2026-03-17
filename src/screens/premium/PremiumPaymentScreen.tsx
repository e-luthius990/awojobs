import React, { useCallback, useMemo, useState, type ViewStyle } from "react";
import { Linking, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { supabase } from "../../core/supabase";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppHeader } from "../../ui/AppHeader";
import { AppText } from "../../ui/AppText";
import { AppCard } from "../../ui/AppCard";
import { AppButton } from "../../ui/AppButton";
import { InlineAlert } from "../../ui/InlineAlert";
import { StatusBadge } from "../../ui/StatusBadge";

type PremiumPurpose = "premium_1_day" | "premium_7_days" | "premium_30_days";

type RouteParams = {
  purpose: PremiumPurpose;
  planLabel: string;
  amount: number;
  intentId?: string | null;
  paymentReference?: string | null;
};

type PremiumPaymentResponse = {
  payment_url?: string | null;
  checkout_url?: string | null;
  payment_reference?: string | null;
  intent_id?: string | null;
  status?: string | null;
  message?: string | null;
  active?: boolean | null;
  error?: string | null;
};

function formatCurrency(amount: number) {
  return `UGX ${amount.toLocaleString()}`;
}

function purposeLabel(purpose: PremiumPurpose) {
  switch (purpose) {
    case "premium_1_day":
      return "1 Day Access";
    case "premium_7_days":
      return "7 Days Access";
    case "premium_30_days":
      return "30 Days Access";
    default:
      return "Premium Access";
  }
}

function purposeDescription(purpose: PremiumPurpose) {
  switch (purpose) {
    case "premium_1_day":
      return "Short-term access for immediate job browsing.";
    case "premium_7_days":
      return "A practical weekly option for broader discovery.";
    case "premium_30_days":
      return "Longer access for more consistent job searching.";
    default:
      return "Premium access.";
  }
}

export default function PremiumPaymentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();

  const { purpose, planLabel, amount, intentId, paymentReference } =
    (route.params ?? {}) as RouteParams;

  const [startingPayment, setStartingPayment] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const safePurpose = purpose ?? "premium_7_days";
  const safePlanLabel = planLabel ?? purposeLabel(safePurpose);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    }),
    [theme.spacing.lg, theme.spacing.xxxl],
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

  const valueBlockStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      alignItems: "flex-end",
    }),
    [],
  );

  const actionGroupStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const noteListStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const noteRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const openExternalPayment = useCallback(async () => {
    if (startingPayment) return;

    try {
      setStartingPayment(true);
      setError(null);
      setStatusMessage(null);

      const { data, error } = await supabase.functions.invoke(
        "start_premium_payment",
        {
          body: {
            purpose: safePurpose,
            intent_id: intentId ?? null,
            payment_reference: paymentReference ?? null,
          },
        },
      );

      if (error) throw error;

      const payload = (data ?? {}) as PremiumPaymentResponse;

      if (payload.error) {
        throw new Error(payload.error);
      }

      const url = payload.payment_url ?? payload.checkout_url ?? null;

      if (!url) {
        throw new Error(
          payload.message ?? "Payment link could not be created.",
        );
      }

      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error("Payment link could not be opened on this device.");
      }

      await Linking.openURL(url);
    } catch (err: any) {
      setError(err?.message ?? "Unable to continue. Please try again.");
    } finally {
      setStartingPayment(false);
    }
  }, [intentId, paymentReference, safePurpose, startingPayment]);

  const checkPaymentStatus = useCallback(async () => {
    if (checkingStatus) return;

    try {
      setCheckingStatus(true);
      setError(null);
      setStatusMessage(null);

      const { data, error } = await supabase.functions.invoke(
        "check_premium_status",
        {
          body: {
            intent_id: intentId ?? null,
            payment_reference: paymentReference ?? null,
          },
        },
      );

      if (error) throw error;

      const payload = (data ?? {}) as PremiumPaymentResponse;

      if (payload.error) {
        throw new Error(payload.error);
      }

      const status = payload.status ?? null;

      if (status === "confirmed" || payload.active === true) {
        navigation.reset({
          index: 1,
          routes: [{ name: "App" }, { name: "Premium" }],
        });
        return;
      }

      if (status === "pending") {
        setStatusMessage(
          "Your payment is still being processed. Check again shortly.",
        );
        return;
      }

      setStatusMessage("We have not received payment confirmation yet.");
    } catch (err: any) {
      setError(err?.message ?? "Unable to check payment status.");
    } finally {
      setCheckingStatus(false);
    }
  }, [checkingStatus, intentId, navigation, paymentReference]);

  return (
    <AppScreen scroll>
      <View style={contentStyle}>
        <AppHeader
          title="Premium Payment"
          subtitle="Complete payment to activate your plan."
          onBackPress={() => navigation.goBack()}
        />

        {error ? <InlineAlert tone="error" message={error} /> : null}

        {statusMessage ? (
          <InlineAlert tone="info" message={statusMessage} />
        ) : null}

        <AppCard variant="premium" padding="lg">
          <View style={sectionStyle}>
            <StatusBadge label="Premium Plan" tone="premium" />

            <View style={rowStyle}>
              <View style={{ flex: 1, gap: theme.spacing.xs }}>
                <AppText variant="titleLg">{safePlanLabel}</AppText>
                <AppText variant="bodySm" tone="secondary">
                  {purposeDescription(safePurpose)}
                </AppText>
              </View>

              <View style={valueBlockStyle}>
                <AppText variant="h2">{formatCurrency(safeAmount)}</AppText>
              </View>
            </View>
          </View>
        </AppCard>

        <AppCard variant="elevated" padding="lg">
          <View style={sectionStyle}>
            <AppText variant="titleLg">Payment summary</AppText>

            <View style={rowStyle}>
              <AppText variant="bodySm" tone="secondary">
                Plan
              </AppText>
              <AppText variant="bodySm" weight="700">
                {safePlanLabel}
              </AppText>
            </View>

            <View style={rowStyle}>
              <AppText variant="bodySm" tone="secondary">
                Purpose
              </AppText>
              <AppText variant="bodySm" weight="700">
                {purposeLabel(safePurpose)}
              </AppText>
            </View>

            <View style={rowStyle}>
              <AppText variant="bodySm" tone="secondary">
                Amount
              </AppText>
              <AppText variant="bodySm" weight="700">
                {formatCurrency(safeAmount)}
              </AppText>
            </View>

            {paymentReference ? (
              <View style={rowStyle}>
                <AppText variant="bodySm" tone="secondary">
                  Reference
                </AppText>
                <AppText variant="bodySm" weight="700">
                  {paymentReference}
                </AppText>
              </View>
            ) : null}
          </View>
        </AppCard>

        <InlineAlert
          tone="info"
          title="Before you pay"
          message="After payment, activation may take a short moment to confirm. Use the status check button below if you return from the payment page."
        />

        <AppCard variant="default" padding="lg">
          <View style={sectionStyle}>
            <AppText variant="titleLg">What happens next</AppText>

            <View style={noteListStyle}>
              <View style={noteRowStyle}>
                <AppText variant="bodySm">•</AppText>
                <AppText variant="bodySm" tone="secondary">
                  Continue to the secure payment page
                </AppText>
              </View>

              <View style={noteRowStyle}>
                <AppText variant="bodySm">•</AppText>
                <AppText variant="bodySm" tone="secondary">
                  Complete the payment using the available method
                </AppText>
              </View>

              <View style={noteRowStyle}>
                <AppText variant="bodySm">•</AppText>
                <AppText variant="bodySm" tone="secondary">
                  Return here and check status if activation is not immediate
                </AppText>
              </View>
            </View>
          </View>
        </AppCard>

        <View style={actionGroupStyle}>
          <AppButton
            title="Continue to Payment"
            onPress={openExternalPayment}
            loading={startingPayment}
            disabled={startingPayment || checkingStatus}
            variant="primary"
          />

          <AppButton
            title="Check Payment Status"
            onPress={checkPaymentStatus}
            loading={checkingStatus}
            disabled={checkingStatus || startingPayment}
            variant="secondary"
          />
        </View>
      </View>
    </AppScreen>
  );
}
