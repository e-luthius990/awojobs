import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";

import { supabase } from "../../core/supabase";
import { useSession } from "../../state/useSession";

export default function EmployerTrustScreen() {
  const { session } = useSession();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* =====================================================
     LOAD DATA
  ====================================================== */
  const load = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc("employer_trust_summary", {
        p_employer_id: session.user.id,
      });

      if (error) throw error;

      setData(data ?? null);
    } catch (err) {
      console.error("[EmployerTrust]", err);
      Alert.alert("Error", "Unable to load trust metrics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  /* =====================================================
     TRUST SCORE (DERIVED)
  ====================================================== */
  const trustScore = useMemo(() => {
    if (!data) return 0;

    const total = data.total_jobs ?? 0;
    const expired = data.expired_jobs ?? 0;
    const flagged = data.flagged_jobs ?? 0;

    if (total === 0) return 100;

    const penalty = (expired / total) * 30 + (flagged / total) * 70;

    return Math.max(0, Math.round(100 - penalty));
  }, [data]);

  const trustLevel = useMemo(() => {
    if (trustScore >= 85) return "Excellent";
    if (trustScore >= 70) return "Good";
    if (trustScore >= 50) return "Moderate";
    return "Risky";
  }, [trustScore]);

  /* =====================================================
     LOADING
  ====================================================== */
  if (loading) {
    return (
      <View style={center}>
        <ActivityIndicator />
        <Text style={muted}>Analyzing trust signals…</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={center}>
        <Text style={muted}>No trust data available.</Text>
      </View>
    );
  }

  /* =====================================================
     UI
  ====================================================== */
  return (
    <ScrollView
      style={container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <Text style={header}>🛡 Trust & Risk</Text>

      {/* TRUST SCORE CARD */}
      <View style={[scoreCard, trustScore < 50 && scoreDanger]}>
        <Text style={scoreLabel}>Trust Score</Text>
        <Text style={scoreValue}>{trustScore}/100</Text>
        <Text style={scoreLevel}>{trustLevel}</Text>
      </View>

      {/* METRICS */}
      <Metric label="Total Jobs Posted" value={data.total_jobs ?? 0} />
      <Metric label="Expired Jobs" value={data.expired_jobs ?? 0} />
      <Metric label="Flagged Jobs" value={data.flagged_jobs ?? 0} />

      {/* INTERPRETATION */}
      <View style={infoCard}>
        <Text style={infoTitle}>How this works</Text>
        <Text style={infoText}>
          Your trust score is based on job reliability and risk signals. Expired
          and flagged jobs reduce visibility in feed ranking.
        </Text>
      </View>
    </ScrollView>
  );
}

/* =====================================================
   COMPONENTS
===================================================== */

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={card}>
      <Text style={labelStyle}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const container = {
  flex: 1,
  backgroundColor: "#F8F9FB",
  padding: 16,
};

const center = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
};

const muted = {
  marginTop: 8,
  color: "#64748B",
};

const header = {
  fontSize: 22,
  fontWeight: "800",
  marginBottom: 20,
};

const card = {
  backgroundColor: "#FFF",
  padding: 16,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#E5E7EB",
  marginBottom: 12,
};

const labelStyle = {
  fontSize: 12,
  color: "#64748B",
};

const valueStyle = {
  fontSize: 20,
  fontWeight: "800",
};

const scoreCard = {
  backgroundColor: "#ECFDF5",
  padding: 20,
  borderRadius: 20,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: "#22C55E",
};

const scoreDanger = {
  backgroundColor: "#FEF2F2",
  borderColor: "#EF4444",
};

const scoreLabel = {
  fontSize: 12,
  color: "#64748B",
};

const scoreValue = {
  fontSize: 28,
  fontWeight: "900",
};

const scoreLevel = {
  fontSize: 14,
  fontWeight: "700",
  marginTop: 4,
};

const infoCard = {
  marginTop: 20,
  padding: 16,
  backgroundColor: "#EEF2FF",
  borderRadius: 16,
};

const infoTitle = {
  fontSize: 14,
  fontWeight: "800",
  marginBottom: 6,
};

const infoText = {
  fontSize: 13,
  color: "#334155",
};
