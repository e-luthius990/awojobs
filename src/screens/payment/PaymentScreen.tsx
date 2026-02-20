import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { supabase } from "../../core/supabase";

/* =====================================================
   TYPES
===================================================== */

type Sponsorship =
  | null
  | "sponsored_day"
  | "sponsored_week"
  | "sponsored_month";

type PaymentMode = "create" | "renew";

/* =====================================================
   DISPLAY PRICES (SERVER REVALIDATES)
===================================================== */

const PRICES = {
  job_post: 2000,
  sponsored_day: 5000,
  sponsored_week: 10000,
  sponsored_month: 25000,
} as const;

/* =====================================================
   SCREEN
===================================================== */

export default function PaymentScreen({ route, navigation }: any) {
  const params = route?.params ?? {};

  const jobDraft = params.jobDraft;
  const mode: PaymentMode = params.mode === "renew" ? "renew" : "create";
  const jobId: string | undefined = params.jobId;

  const [sponsorship, setSponsorship] = useState<Sponsorship>(null);
  const [loading, setLoading] = useState(false);
  const [valid, setValid] = useState(true);

  /* ---------------------------------------------
     VALIDATE PARAMS SAFELY
  ---------------------------------------------- */
  useEffect(() => {
    if (
      !jobDraft ||
      typeof jobDraft.title !== "string" ||
      !jobDraft.pay_type ||
      !jobDraft.contact_method ||
      !jobDraft.expires_at ||
      !jobDraft.location_id
    ) {
      setValid(false);
      Alert.alert("Invalid job data", "Please start posting again.", [
        {
          text: "OK",
          onPress: () => navigation.popToTop(),
        },
      ]);
    }
  }, []);

  if (!valid) return null;

  /* ---------------------------------------------
     TOTAL (DISPLAY ONLY)
  ---------------------------------------------- */
  const total = PRICES.job_post + (sponsorship ? PRICES[sponsorship] : 0);

  /* ---------------------------------------------
     CREATE PAYMENT INTENT
  ---------------------------------------------- */
  async function proceedToPay() {
    if (loading) return;

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke("create_job_intent", {
        body: {
          job: jobDraft,
          sponsorship,
          mode,
          job_id: jobId ?? null,
        },
      });

      if (error) throw error;

      navigation.replace("PaymentPending");
    } catch (e: any) {
      Alert.alert(
        "Payment error",
        e?.message ?? "Unable to process payment. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     UI
  ====================================================== */

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#F8F9FB" }}>
      <Text style={title}>Payment</Text>

      {/* BASE FEE */}
      <Section>
        <Row>
          <Text style={rowText}>Job posting</Text>
          <Text style={rowText}>UGX {PRICES.job_post}</Text>
        </Row>
        <Text style={hint}>Required to publish your job</Text>
      </Section>

      {/* SPONSORSHIP */}
      <Section>
        <Text style={sectionTitle}>Boost visibility (optional)</Text>

        <Text style={hint}>
          Boosted jobs appear higher and may reach nearby areas.
        </Text>

        <Option
          label="1 Day boost"
          price="UGX 5,000"
          active={sponsorship === "sponsored_day"}
          onPress={() => setSponsorship("sponsored_day")}
        />

        <Option
          label="1 Week boost"
          price="UGX 10,000"
          active={sponsorship === "sponsored_week"}
          onPress={() => setSponsorship("sponsored_week")}
        />

        <Option
          label="1 Month boost"
          price="UGX 25,000"
          active={sponsorship === "sponsored_month"}
          onPress={() => setSponsorship("sponsored_month")}
        />

        {sponsorship && (
          <Pressable
            onPress={() => setSponsorship(null)}
            style={{ marginTop: 6 }}
          >
            <Text style={removeBoost}>Remove boost</Text>
          </Pressable>
        )}
      </Section>

      {/* TOTAL */}
      <Section>
        <Row>
          <Text style={totalLabel}>Total</Text>
          <Text style={totalLabel}>UGX {total}</Text>
        </Row>
      </Section>

      {/* PAY BUTTON */}
      <Pressable
        onPress={proceedToPay}
        disabled={loading}
        style={[payBtn, { opacity: loading ? 0.6 : 1 }]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={payText}>Pay & Publish</Text>
        )}
      </Pressable>
    </View>
  );
}

/* =====================================================
   UI COMPONENTS
===================================================== */

function Section({ children }: { children: React.ReactNode }) {
  return <View style={section}>{children}</View>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={row}>{children}</View>;
}

function Option({
  label,
  price,
  active,
  onPress,
}: {
  label: string;
  price: string;
  active: boolean;
  onPress(): void;
}) {
  return (
    <Pressable onPress={onPress} style={[option, active && optionActive]}>
      <Row>
        <Text
          style={{
            color: active ? "#fff" : "#0F172A",
            fontWeight: "700",
          }}
        >
          {label}
        </Text>

        <Text
          style={{
            color: active ? "#fff" : "#0F172A",
            fontWeight: "700",
          }}
        >
          {price}
        </Text>
      </Row>
    </Pressable>
  );
}

/* =====================================================
   STYLES
===================================================== */

const title = {
  fontSize: 22,
  fontWeight: "800",
  marginBottom: 16,
};

const section = {
  backgroundColor: "#fff",
  padding: 14,
  borderRadius: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: "#E5E7EB",
};

const sectionTitle = {
  fontWeight: "800",
  marginBottom: 6,
  fontSize: 14,
};

const hint = {
  fontSize: 12,
  color: "#64748B",
  marginBottom: 10,
};

const row = {
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
  alignItems: "center" as const,
};

const rowText = {
  fontWeight: "600",
};

const totalLabel = {
  fontWeight: "800",
  fontSize: 15,
};

const option = {
  padding: 12,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#CBD5E1",
  marginBottom: 10,
};

const optionActive = {
  backgroundColor: "#0F172A",
  borderColor: "#0F172A",
};

const removeBoost = {
  fontSize: 12,
  color: "#475569",
};

const payBtn = {
  backgroundColor: "#0F172A",
  paddingVertical: 16,
  borderRadius: 18,
};

const payText = {
  color: "#fff",
  fontWeight: "800",
  textAlign: "center" as const,
  fontSize: 16,
};
