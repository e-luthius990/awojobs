import React, { useEffect, useState, useCallback } from "react";
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

export default function EmployerInsightsScreen() {
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
      const { data, error } = await supabase.rpc("employer_insights_summary", {
        p_employer_id: session.user.id,
      });

      if (error) throw error;

      setData(data ?? null);
    } catch (err) {
      console.error("[EmployerInsights]", err);
      Alert.alert("Error", "Unable to load insights.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  /* =====================================================
     INITIAL LOAD
  ====================================================== */
  useEffect(() => {
    load();
  }, [load]);

  /* =====================================================
     LOADING
  ====================================================== */
  if (loading) {
    return (
      <View style={center}>
        <ActivityIndicator />
        <Text style={muted}>Loading insights…</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={center}>
        <Text style={muted}>No insights available yet.</Text>
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
      <Text style={header}>📊 Employer Insights</Text>

      <View style={grid}>
        <Metric label="Total Jobs" value={data.total_jobs ?? 0} />
        <Metric label="Applications" value={data.total_applications ?? 0} />
      </View>

      <Metric
        label="Conversion Rate"
        value={`${Number(data.conversion_rate ?? 0).toFixed(2)} per job`}
        highlight
      />

      <Metric
        label="Avg Time to First Application"
        value={`${Number(data.avg_time_to_first_application_hours ?? 0).toFixed(
          1,
        )} hrs`}
      />
    </ScrollView>
  );
}

/* =====================================================
   COMPONENTS
===================================================== */

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <View style={[card, highlight && cardHighlight]}>
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

const grid = {
  flexDirection: "row" as const,
  gap: 12,
  marginBottom: 12,
};

const card = {
  flex: 1,
  backgroundColor: "#FFF",
  padding: 16,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#E5E7EB",
  marginBottom: 12,
};

const cardHighlight = {
  borderColor: "#22C55E",
};

const labelStyle = {
  fontSize: 12,
  color: "#64748B",
};

const valueStyle = {
  fontSize: 20,
  fontWeight: "800",
};
