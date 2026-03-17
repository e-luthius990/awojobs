import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ViewStyle,
} from "react";
import { AppState, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../core/supabase";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppCard } from "../../ui/AppCard";
import { AppText } from "../../ui/AppText";
import { AppButton } from "../../ui/AppButton";
import { InlineAlert } from "../../ui/InlineAlert";
import { StatusBadge } from "../../ui/StatusBadge";

const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 180_000;

type PaymentState = "pending" | "paid" | "failed" | "expired";

type CheckPaymentResponse = {
  status?: "confirmed" | "failed" | "expired" | "unknown" | "pending" | null;
  error?: string | null;
};

export default function PaymentPendingScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { intentId, jobId, flow = "job_post" } = route.params ?? {};

  const [status, setStatus] = useState<PaymentState>("pending");
  const [checkingNow, setCheckingNow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTimeRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(true);
  const navigatingRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const exitToSafeScreen = useCallback(() => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    navigation.popToTop();
  }, [navigation]);

  const handleConfirmed = useCallback(() => {
    if (navigatingRef.current) return;

    stopPolling();
    setStatus("paid");

    setTimeout(() => {
      if (navigatingRef.current) return;
      navigatingRef.current = true;

      if (flow === "sponsor_upgrade") {
        navigation.reset({
          index: 0,
          routes: [{ name: "EmployerTabs" }],
        });
      } else {
        navigation.replace("PostingSuccess");
      }
    }, 600);
  }, [flow, navigation, stopPolling]);

  const poll = useCallback(
    async (manual = false) => {
      if (!activeRef.current || !intentId || navigatingRef.current) return;

      if (manual) setCheckingNow(true);

      try {
        const { data, error } = await supabase.functions.invoke(
          "check_payment_status",
          { body: { intent_id: intentId } },
        );

        if (!activeRef.current || navigatingRef.current) return;
        if (error) throw error;

        const payload = (data ?? {}) as CheckPaymentResponse;
        if (payload.error) {
          throw new Error(payload.error);
        }

        const serverStatus = payload.status ?? "pending";

        if (serverStatus === "confirmed") {
          handleConfirmed();
          return;
        }

        if (serverStatus === "failed") {
          stopPolling();
          setStatus("failed");
          setError("Payment failed. Please try again.");
          return;
        }

        if (serverStatus === "expired") {
          stopPolling();
          setStatus("expired");
          setError("This payment session has expired.");
          return;
        }

        if (serverStatus === "unknown") {
          stopPolling();
          setStatus("failed");
          setError("Payment session was not found.");
          return;
        }

        if (Date.now() - startTimeRef.current > MAX_WAIT_MS) {
          stopPolling();
          setError(
            "Payment is taking longer than expected. You can check again later from My Jobs.",
          );
        }
      } catch {
        if (!activeRef.current || navigatingRef.current) return;

        if (manual) {
          setError("Unable to check payment status right now.");
        }
      } finally {
        if (manual) setCheckingNow(false);
      }
    },
    [handleConfirmed, intentId, stopPolling],
  );

  useEffect(() => {
    if (!intentId || !jobId) {
      setStatus("failed");
      setError("Missing payment reference.");
      return;
    }

    activeRef.current = true;
    navigatingRef.current = false;
    startTimeRef.current = Date.now();

    void poll();
    intervalRef.current = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      activeRef.current = false;
      stopPolling();
    };
  }, [intentId, jobId, poll, stopPolling]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void poll();
      }
    });

    return () => sub.remove();
  }, [poll]);

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      justifyContent: "center",
      gap: theme.spacing.lg,
    }),
    [theme.spacing.lg],
  );

  const cardContentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.lg,
    }),
    [theme.spacing.lg],
  );

  const heroStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const iconWrapStyle = useMemo<ViewStyle>(
    () => ({
      width: 64,
      height: 64,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        status === "paid"
          ? theme.colors.successSoft
          : status === "pending"
            ? theme.colors.warningSoft
            : theme.colors.errorSoft,
      borderWidth: 1,
      borderColor:
        status === "paid"
          ? theme.colors.verifiedBorder
          : status === "pending"
            ? theme.colors.warning
            : theme.colors.error,
    }),
    [
      status,
      theme.colors.error,
      theme.colors.errorSoft,
      theme.colors.successSoft,
      theme.colors.verifiedBorder,
      theme.colors.warning,
      theme.colors.warningSoft,
      theme.radius.pill,
    ],
  );

  const titleWrapStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.xs,
      alignItems: "center",
    }),
    [theme.spacing.xs],
  );

  const actionsStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const statusCopy = {
    pending: {
      badge: "Processing",
      tone: "warning" as const,
      title: "Confirming payment…",
      subtitle:
        "Please keep the app open while we wait for payment confirmation.",
      icon: "time-outline" as const,
    },
    paid: {
      badge: "Confirmed",
      tone: "success" as const,
      title: "Payment confirmed",
      subtitle: "Your payment was received successfully.",
      icon: "checkmark" as const,
    },
    failed: {
      badge: "Failed",
      tone: "error" as const,
      title: "Payment failed",
      subtitle: "We could not confirm the payment.",
      icon: "close" as const,
    },
    expired: {
      badge: "Expired",
      tone: "error" as const,
      title: "Payment expired",
      subtitle: "This payment session has expired.",
      icon: "alert-outline" as const,
    },
  }[status];

  const pendingMessage =
    flow === "sponsor_upgrade"
      ? "Your sponsorship will be applied after payment confirmation."
      : "Your job will be published after payment is confirmed.";

  return (
    <AppScreen centerContent>
      <View style={contentStyle}>
        <AppCard
          variant={status === "paid" ? "premium" : "elevated"}
          padding="lg"
        >
          <View style={cardContentStyle}>
            <View style={heroStyle}>
              <View style={iconWrapStyle}>
                <Ionicons
                  name={statusCopy.icon}
                  size={28}
                  color={
                    status === "paid"
                      ? theme.colors.success
                      : status === "pending"
                        ? theme.colors.warning
                        : theme.colors.error
                  }
                />
              </View>

              <View style={{ alignItems: "center" }}>
                <StatusBadge label={statusCopy.badge} tone={statusCopy.tone} />
              </View>

              <View style={titleWrapStyle}>
                <AppText variant="h2" align="center">
                  {statusCopy.title}
                </AppText>
                <AppText variant="bodySm" tone="secondary" align="center">
                  {statusCopy.subtitle}
                </AppText>
              </View>
            </View>

            {status === "pending" ? (
              <>
                <InlineAlert
                  tone="info"
                  message="Do not close the app yet. We will continue checking automatically."
                />
                <InlineAlert
                  tone="warning"
                  title="Processing in progress"
                  message={pendingMessage}
                />
              </>
            ) : null}

            {error ? <InlineAlert tone="error" message={error} /> : null}
          </View>
        </AppCard>

        {status === "pending" ? (
          <View style={actionsStyle}>
            <AppButton
              title="Check Again Now"
              onPress={() => void poll(true)}
              loading={checkingNow}
              disabled={checkingNow}
              variant="secondary"
            />

            <AppButton
              title="Back"
              onPress={exitToSafeScreen}
              variant="ghost"
            />
          </View>
        ) : (
          <View style={actionsStyle}>
            <AppButton
              title="Back"
              onPress={exitToSafeScreen}
              variant="primary"
            />
          </View>
        )}
      </View>
    </AppScreen>
  );
}
