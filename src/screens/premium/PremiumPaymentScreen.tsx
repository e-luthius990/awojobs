import React, { useCallback, useMemo, useState, type ViewStyle } from "react";
import { View } from "react-native";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppHeader } from "../../ui/AppHeader";
import { AppText } from "../../ui/AppText";
import { AppCard } from "../../ui/AppCard";
import { AppButton } from "../../ui/AppButton";
import { InlineAlert } from "../../ui/InlineAlert";
import { StatusBadge } from "../../ui/StatusBadge";
import type { RootStackParamList } from "../../navigation/RootNavigator";
import {
  openPremiumPaymentUrl,
  checkPremiumPaymentStatus,
  type PremiumPurpose,
} from "../../services/premium.payment.service";

type PremiumPaymentRouteProp = RouteProp<RootStackParamList, "PremiumPayment">;
type PremiumPaymentNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "PremiumPayment"
>;

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
  }
}

export default function PremiumPaymentScreen() {
  const navigation = useNavigation<PremiumPaymentNavigationProp>();
  const route = useRoute<PremiumPaymentRouteProp>();
  const { theme } = useTheme();

  const { purpose, planLabel, amount, intentId, paymentReference } =
    route.params;

  const [startingPayment, setStartingPayment] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const hasPaymentReference = Boolean(intentId || paymentReference);
  const safePlanLabel = planLabel || purposeLabel(purpose);
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : null;

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
    if (startingPayment || checkingStatus) return;

    if (!hasPaymentReference) {
      setError("Payment session is missing. Please go back and try again.");
      return;
    }

    setStartingPayment(true);
    setError(null);
    setStatusMessage(null);

    try {
      const result = await openPremiumPaymentUrl({
        purpose,
        intentId: intentId ?? null,
        paymentReference: paymentReference ?? null,
      });

      if (!result.ok) {
        setError(result.error.message);
      }
    } finally {
      setStartingPayment(false);
    }
  }, [
    checkingStatus,
    hasPaymentReference,
    intentId,
    paymentReference,
    purpose,
    startingPayment,
  ]);

  const checkPaymentStatus = useCallback(async () => {
    if (checkingStatus || startingPayment) return;

    if (!hasPaymentReference) {
      setError("Payment session is missing. Please go back and try again.");
      return;
    }

    setCheckingStatus(true);
    setError(null);
    setStatusMessage(null);

    try {
      const result = await checkPremiumPaymentStatus({
        intentId: intentId ?? null,
        paymentReference: paymentReference ?? null,
      });

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      if (result.data.status === "confirmed" || result.data.active) {
        navigation.reset({
          index: 1,
          routes: [{ name: "App" }, { name: "Premium" }],
        });
        return;
      }

      if (result.data.status === "pending") {
        setStatusMessage(
          "Your payment is still being processed. Check again shortly.",
        );
        return;
      }

      if (
        result.data.status === "failed" ||
        result.data.status === "cancelled" ||
        result.data.status === "expired"
      ) {
        setStatusMessage(
          result.data.message ??
            "This payment was not completed. You can try again.",
        );
        return;
      }

      setStatusMessage(
        result.data.message ?? "We have not received payment confirmation yet.",
      );
    } finally {
      setCheckingStatus(false);
    }
  }, [
    checkingStatus,
    hasPaymentReference,
    intentId,
    navigation,
    paymentReference,
    startingPayment,
  ]);

  return (
    <AppScreen scroll>
      <View style={contentStyle}>
        <AppHeader
          title="Premium Payment"
          subtitle="Complete payment to activate your plan."
          onBackPress={() => navigation.goBack()}
        />

        {!hasPaymentReference ? (
          <InlineAlert
            tone="error"
            title="Invalid payment session"
            message="This premium payment session is missing required identifiers. Go back and start again."
          />
        ) : null}

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
                  {purposeDescription(purpose)}
                </AppText>
              </View>

              <View style={valueBlockStyle}>
                <AppText variant="h2">
                  {safeAmount !== null ? formatCurrency(safeAmount) : "—"}
                </AppText>
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
                {purposeLabel(purpose)}
              </AppText>
            </View>

            <View style={rowStyle}>
              <AppText variant="bodySm" tone="secondary">
                Amount
              </AppText>
              <AppText variant="bodySm" weight="700">
                {safeAmount !== null
                  ? formatCurrency(safeAmount)
                  : "Unavailable"}
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
            onPress={() => void openExternalPayment()}
            loading={startingPayment}
            disabled={startingPayment || checkingStatus || !hasPaymentReference}
            variant="primary"
          />

          <AppButton
            title="Check Payment Status"
            onPress={() => void checkPaymentStatus()}
            loading={checkingStatus}
            disabled={checkingStatus || startingPayment || !hasPaymentReference}
            variant="secondary"
          />
        </View>
      </View>
    </AppScreen>
  );
}
