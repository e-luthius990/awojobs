import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from "react-native";

import { supabase } from "../../core/supabase";
import { useSession } from "../../state/useSession";

export default function EmployerDashboardScreen({ navigation }: any) {
  const { session } = useSession();

  const [summary, setSummary] = useState<any>(null);
  const [employerPhone, setEmployerPhone] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function formatUgPhone(phone?: string | null) {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("256") && digits.length === 12) {
      return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(
        6,
        9,
      )} ${digits.slice(9)}`;
    }
    return phone;
  }

  const loadDashboard = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase.rpc("employer_dashboard_summary", {
        p_employer_id: session.user.id,
      });

      if (error) throw error;
      setSummary(data);

      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_number")
        .eq("id", session.user.id)
        .single();

      setEmployerPhone(profile?.phone_number ?? null);
    } catch (err) {
      console.error(err);
      Alert.alert("Error loading dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: "#64748B" }}>
          Loading dashboard…
        </Text>
      </View>
    );
  }

  if (!summary) return null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F1F5F9" }}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadDashboard();
          }}
        />
      }
    >
      {/* =======================================================
         HEADER CARD
      ======================================================= */}
      <View style={headerCard}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={phoneHeader}>{formatUgPhone(employerPhone)}</Text>

          <View style={verifiedBadge}>
            <Text style={verifiedText}>Verified</Text>
          </View>
        </View>

        <Text style={subHeader}>Employer Account</Text>
      </View>

      {/* =======================================================
         PERFORMANCE SECTION
      ======================================================= */}
      <Text style={sectionTitle}>Performance</Text>

      <View style={statsGrid}>
        <MiniStat label="Total Jobs" value={summary.total_jobs} />
        <MiniStat label="Active" value={summary.active_jobs} />
        <MiniStat label="Expired" value={summary.expired_jobs} />
        <MiniStat label="Sponsored" value={summary.sponsored_jobs} highlight />
      </View>

      <View style={{ marginTop: 12 }}>
        <LargeStat
          label="Applications (30 days)"
          value={summary.applications_30d}
        />
      </View>

      {/* =======================================================
         ACTIONS SECTION
      ======================================================= */}
      <Text style={sectionTitle}>Actions</Text>

      <PrimaryButton
        label="Post a new job"
        onPress={() => navigation.navigate("PostJobFlow")}
      />

      {/* ✅ NEW: Manage Jobs entry */}
      <SecondaryButton
        label="Manage jobs"
        onPress={() => navigation.navigate("MyJobs")}
      />

      <SecondaryButton
        label="Applications inbox"
        disabled={summary.applications_30d === 0}
        onPress={() => navigation.navigate("ApplicationsInbox")}
      />

      {/* =======================================================
         INSIGHTS SECTION
      ======================================================= */}
      <Text style={sectionTitle}>Insights</Text>

      <CardButton
        label="Employer Insights"
        onPress={() => navigation.navigate("EmployerInsights")}
      />

      <CardButton
        label="Sponsored Performance"
        onPress={() => navigation.navigate("SponsoredInsights")}
      />

      <CardButton
        label="Trust & Risk"
        onPress={() => navigation.navigate("EmployerTrust")}
      />
    </ScrollView>
  );
}

/* =======================================================
   COMPONENTS
======================================================= */

function MiniStat({ label, value, highlight }: any) {
  return (
    <View style={[miniCard, highlight && miniHighlight]}>
      <Text style={miniLabel}>{label}</Text>
      <Text style={miniValue}>{value}</Text>
    </View>
  );
}

function LargeStat({ label, value }: any) {
  return (
    <View style={largeCard}>
      <Text style={miniLabel}>{label}</Text>
      <Text style={largeValue}>{value}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={primaryBtn}>
      <Text style={primaryText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, disabled }: any) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[secondaryBtn, disabled && { opacity: 0.4 }]}
    >
      <Text style={secondaryText}>{label}</Text>
    </Pressable>
  );
}

function CardButton({ label, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={cardBtn}>
      <Text style={{ fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

/* =======================================================
   STYLES
======================================================= */

const headerCard = {
  backgroundColor: "#0F172A",
  padding: 20,
  borderRadius: 20,
  marginBottom: 20,
};

const phoneHeader = {
  fontSize: 20,
  fontWeight: "800" as const,
  color: "#FFFFFF",
};

const subHeader = {
  fontSize: 13,
  color: "#CBD5E1",
  marginTop: 6,
};

const verifiedBadge = {
  backgroundColor: "rgba(34, 197, 94, 0.16)",
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 999,
  marginLeft: 10,
  borderWidth: 1,
  borderColor: "rgba(34, 197, 94, 0.35)",
};

const verifiedText = {
  fontSize: 11,
  fontWeight: "800" as const,
  color: "#86EFAC",
};

const sectionTitle = {
  fontSize: 14,
  fontWeight: "700" as const,
  color: "#475569",
  marginBottom: 12,
  marginTop: 16,
};

const statsGrid = {
  flexDirection: "row" as const,
  flexWrap: "wrap" as const,
  justifyContent: "space-between" as const,
};

const miniCard = {
  backgroundColor: "#FFFFFF",
  width: "48%" as const,
  padding: 16,
  borderRadius: 16,
  marginBottom: 12,
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

const miniHighlight = {
  borderWidth: 1,
  borderColor: "#22C55E",
};

const miniLabel = {
  fontSize: 12,
  color: "#64748B",
};

const miniValue = {
  fontSize: 20,
  fontWeight: "800" as const,
  marginTop: 4,
};

const largeCard = {
  backgroundColor: "#FFFFFF",
  padding: 20,
  borderRadius: 20,
  marginTop: 0,
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

const largeValue = {
  fontSize: 28,
  fontWeight: "800" as const,
  marginTop: 6,
};

const primaryBtn = {
  backgroundColor: "#0F172A",
  paddingVertical: 16,
  borderRadius: 16,
  alignItems: "center" as const,
  marginBottom: 12,
};

const primaryText = {
  color: "#FFFFFF",
  fontWeight: "700" as const,
};

const secondaryBtn = {
  backgroundColor: "#E2E8F0",
  paddingVertical: 14,
  borderRadius: 16,
  alignItems: "center" as const,
  marginBottom: 12,
};

const secondaryText = {
  fontWeight: "600" as const,
};

const cardBtn = {
  backgroundColor: "#FFFFFF",
  padding: 18,
  borderRadius: 18,
  marginBottom: 12,
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};
