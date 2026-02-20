import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../core/supabase";
import { useSession } from "../../state/useSession";
import { setPendingIntent } from "../../intent/intent.store";

type Plan = {
  id: string;
  label: string;
  price: number;
  purpose: "premium_1_day" | "premium_7_days" | "premium_30_days";
  popular?: boolean;
};

const PLANS: Plan[] = [
  { id: "daily", label: "1 Day Access", price: 2000, purpose: "premium_1_day" },
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

export default function PremiumScreen() {
  const navigation = useNavigation<any>();
  const { session } = useSession();

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [premiumRecord, setPremiumRecord] = useState<any | null>(null);

  const activationHandledRef = useRef(false);

  /* =====================================================
     RESET ACTIVATION FLAG ON MOUNT
  ===================================================== */
  useEffect(() => {
    activationHandledRef.current = false;
  }, []);

  /* =====================================================
     CHECK PREMIUM STATUS (INITIAL LOAD)
  ===================================================== */
  const fetchPremium = useCallback(async () => {
    if (!session) {
      setPremiumRecord(null);
      setChecking(false);
      return;
    }

    const { data } = await supabase
      .from("job_seeker_premium")
      .select("expires_at, status")
      .eq("user_id", session.user.id)
      .maybeSingle();

    setPremiumRecord(data ?? null);
    setChecking(false);
  }, [session]);

  useEffect(() => {
    fetchPremium();
  }, [fetchPremium]);

  /* =====================================================
     REALTIME PREMIUM ACTIVATION
  ===================================================== */
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`premium-${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_seeker_premium",
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const record = payload.new ?? null;
          setPremiumRecord(record);

          if (
            record &&
            record.status === "active" &&
            record.expires_at &&
            new Date(record.expires_at) > new Date() &&
            !activationHandledRef.current
          ) {
            activationHandledRef.current = true;
            navigation.goBack(); // 🔥 Instant return to feed
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, navigation]);

  /* =====================================================
     DERIVED STATE
  ===================================================== */
  const now = Date.now();

  const isActive =
    premiumRecord &&
    premiumRecord.status === "active" &&
    premiumRecord.expires_at &&
    new Date(premiumRecord.expires_at).getTime() > now;

  const daysRemaining = isActive
    ? Math.ceil(
        (new Date(premiumRecord.expires_at).getTime() - now) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  const isExpired = session && !isActive;

  /* =====================================================
     HANDLE ALREADY ACTIVE ON MOUNT
  ===================================================== */
  useEffect(() => {
    if (isActive && !activationHandledRef.current) {
      activationHandledRef.current = true;
      navigation.goBack();
    }
  }, [isActive, navigation]);

  /* =====================================================
     PURCHASE FLOW
  ===================================================== */
  const handlePurchase = async (plan: Plan) => {
    if (loadingPlan || checking) return;

    // Guest must register first
    if (!session) {
      setPendingIntent({
        intent: "premium",
        returnTo: "Premium",
      });

      navigation.getParent()?.navigate("AuthModal", {
        screen: "Register",
        params: { role: "job_seeker" },
      });

      return;
    }

    try {
      setLoadingPlan(plan.id);

      const { error } = await supabase.functions.invoke(
        "create_premium_intent",
        { body: { purpose: plan.purpose } },
      );

      if (error) throw error;

      // 🔒 No manual navigation.
      // Realtime will handle activation.
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPlan(null);
    }
  };

  /* =====================================================
     RENDER
  ===================================================== */
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Unlock Nationwide Jobs</Text>

      {checking ? (
        <ActivityIndicator style={{ marginVertical: 30 }} />
      ) : isActive ? (
        <View style={styles.activeBox}>
          <Text style={styles.activeTitle}>⭐ Premium Active</Text>
          <Text style={styles.remaining}>
            {daysRemaining <= 1
              ? "Expires tomorrow"
              : `${daysRemaining} days remaining`}
          </Text>
        </View>
      ) : (
        <>
          {isExpired && (
            <View style={styles.renewBox}>
              <Text style={styles.renewText}>
                Your premium expired. Renew to restore nationwide access.
              </Text>
            </View>
          )}

          {PLANS.map((plan) => (
            <View
              key={plan.id}
              style={[styles.card, plan.popular && styles.popularCard]}
            >
              <Text style={styles.planLabel}>{plan.label}</Text>
              <Text style={styles.price}>
                UGX {plan.price.toLocaleString()}
              </Text>

              <TouchableOpacity
                disabled={loadingPlan === plan.id}
                style={[styles.button, plan.popular && styles.popularButton]}
                onPress={() => handlePurchase(plan)}
              >
                {loadingPlan === plan.id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {session ? "Activate Now" : "Register & Continue"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#F8FAFC",
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 24,
    color: "#0F172A",
  },
  activeBox: {
    backgroundColor: "#FEF3C7",
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
  },
  activeTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#92400E",
  },
  remaining: {
    marginTop: 10,
    fontWeight: "700",
    color: "#92400E",
  },
  renewBox: {
    backgroundColor: "#FFF1F2",
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  renewText: {
    fontWeight: "600",
    color: "#7F1D1D",
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  popularCard: {
    borderWidth: 2,
    borderColor: "#6366F1",
  },
  planLabel: {
    fontSize: 18,
    fontWeight: "700",
  },
  price: {
    fontSize: 24,
    fontWeight: "900",
    marginVertical: 12,
  },
  button: {
    backgroundColor: "#0F172A",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  popularButton: {
    backgroundColor: "#6366F1",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
  },
});
