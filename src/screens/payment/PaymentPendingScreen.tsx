import React, { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, Alert, AppState } from "react-native";
import { supabase } from "../../core/supabase";

/* =====================================================
   CONFIG
===================================================== */

const POLL_INTERVAL_MS = 3000; // lighter on GPRS
const MAX_WAIT_MS = 60_000; // 1 minute hard stop

/* =====================================================
   SCREEN
===================================================== */

export default function PaymentPending({ route, navigation }: any) {
  const { providerRef, purpose } = route.params ?? {};

  const [status, setStatus] = useState<"pending" | "paid" | "failed">(
    "pending",
  );

  const startTimeRef = useRef(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    if (!providerRef) {
      Alert.alert("Missing payment reference");
      navigation.popToTop();
    }
  }, [providerRef, navigation]);

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  async function poll() {
    if (!activeRef.current) return;

    try {
      const { data, error } = await supabase.functions.invoke(
        "check_payment_status",
        {
          body: { provider_ref: providerRef },
        },
      );

      if (!activeRef.current) return;
      if (error) throw error;

      if (data.status === "confirmed") {
        stopPolling();
        setStatus("paid");

        if (purpose?.startsWith("premium")) {
          // Premium unlock flow
          navigation.reset({
            index: 0,
            routes: [{ name: "Feed" }],
          });
        } else {
          // Job posting flow
          navigation.replace("PostingSuccess");
        }

        return;
      }

      if (data.status === "failed") {
        stopPolling();
        setStatus("failed");

        Alert.alert("Payment failed");
        navigation.popToTop();
        return;
      }

      if (Date.now() - startTimeRef.current > MAX_WAIT_MS) {
        stopPolling();

        Alert.alert(
          "Still processing",
          "Payment is taking longer than expected. You can check later.",
        );

        navigation.popToTop();
      }
    } catch {
      // silent retry (GPRS safe)
    }
  }

  useEffect(() => {
    activeRef.current = true;

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      activeRef.current = false;
      stopPolling();
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") poll();
    });

    return () => sub.remove();
  }, []);

  return (
    <View style={container}>
      <ActivityIndicator size="large" />
      <Text style={title}>Confirming payment…</Text>
      <Text style={subtitle}>Please don’t close the app</Text>
    </View>
  );
}
