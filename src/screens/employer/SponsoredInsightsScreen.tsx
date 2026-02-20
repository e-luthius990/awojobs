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

export default function SponsoredInsightsScreen() {
  const { session } = useSession();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* =====================================================
     LOAD
  ====================================================== */
  const load = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc("sponsored_insights_summary", {
        p_employer_id: session.user.id,
      });

      if (error) throw error;

      setData(data ?? null);
    } catch (err) {
      console.error("[SponsoredInsights]", err);
      Alert.alert("Error", "Unable to load sponsored insights.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  /* =====================================================
     DERIVED METRICS
  ====================================================== */

  const liftPercentage = useMemo(() => {
    if (!data) return 0;

    const sponsored = data.sponsored_applications ?? 0;
    const organic = data.organic_applications ?? 0;

    if (organic === 0) return sponsored > 0 ? 100 : 0;

    return Math.round(((sponsored - organic) / organic) * 100);
  }, [data]);

  const sponsoredRatio = useMemo(() => {
    if (!data) return 0;

    const total =
      (data.sponsored_applications ?? 0) + (data.organic_applications ?? 0);

    if (total === 0) return 0;

    return Math.round(((data.sponsored_applications ?? 0) / total) * 100);
  }, [data]);

  const performanceLevel = useMemo(() => {
    if (liftPercentage >= 100) return "Excellent Boost";
    if (liftPercentage >= 40) return "Strong Performance";
    if (liftPercentage >= 10) return "Moderate Impact";
    return "Low Impact";
  }, [liftPercentage]);

  /* =====================================================
     LOADING
  ====================================================== */

  if (loading) {
    return (
      <View style={center}>
        <ActivityIndicator />
        <Text style={muted}>Analyzing sponsored performance…</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={center}>
        <Text style={muted}>No sponsored data available.</Text>
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
      <Text style={header}>🚀 Sponsored Performance</Text>

      {/* PERFORMANCE CARD */}
      <View style={performanceCard}>
        <Text style={perfLabel}>Sponsored Lift</Text>
        <Text style={perfValue}>
          {liftPercentage >= 0 ? "+" : ""}
          {liftPercentage}%
        </Text>
        <Text style={perfLevel}>{performanceLevel}</Text>
      </View>

      {/* CORE METRICS */}
      <Metric label="Sponsored Jobs" value={data.sponsored_jobs ?? 0} />
      <Metric
        label="Sponsored Applications"
        value={data.sponsored_applications ?? 0}
      />
      <Metric
        label="Organic Applications"
        value={data.organic_applications ?? 0}
      />

      {/* RATIO INSIGHT */}
      <View style={insightCard}>
        <Text style={insightTitle}>Application Distribution</Text>
        <Text style={insightText}>
          {sponsoredRatio}% of applications are coming from sponsored listings.
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

const performanceCard = {
  backgroundColor: "#ECFDF5",
  padding: 20,
  borderRadius: 20,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: "#22C55E",
};

const perfLabel = {
  fontSize: 12,
  color: "#64748B",
};

const perfValue = {
  fontSize: 28,
  fontWeight: "900",
};

const perfLevel = {
  fontSize: 14,
  fontWeight: "700",
  marginTop: 4,
};

const insightCard = {
  marginTop: 20,
  padding: 16,
  backgroundColor: "#EEF2FF",
  borderRadius: 16,
};

const insightTitle = {
  fontSize: 14,
  fontWeight: "800",
  marginBottom: 6,
};

const insightText = {
  fontSize: 13,
  color: "#334155",
};
