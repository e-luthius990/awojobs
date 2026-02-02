import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

import { fetchMyJobs, deleteJob } from "../../jobs/jobs.mine";
import { Job } from "../../jobs/jobs.types";

/* -------------------------------------------------------
   SCREEN
-------------------------------------------------------- */
export default function MyJobsScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* =====================================================
     LOAD
  ====================================================== */
  async function load(showSpinner = true) {
    if (showSpinner) setLoading(true);
    try {
      const data = await fetchMyJobs();
      setJobs(data);
    } catch {
      Alert.alert("Error", "Could not load your jobs.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /* =====================================================
     REFRESH
  ====================================================== */
  async function refresh() {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  }

  /* =====================================================
     DERIVED
  ====================================================== */
  const now = new Date();

  const activeJobs = useMemo(
    () => jobs.filter((j) => new Date(j.expires_at) > now),
    [jobs],
  );

  /* =====================================================
     DELETE
  ====================================================== */
  function confirmDelete(job: Job) {
    Alert.alert(
      "Delete job?",
      "This job will be removed immediately. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDelete(job.id),
        },
      ],
    );
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteJob(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch {
      Alert.alert("Failed", "Could not delete job. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  /* =====================================================
     UI STATES
  ====================================================== */
  if (loading) {
    return (
      <View style={center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: "#64748B" }}>
          Loading your jobs…
        </Text>
      </View>
    );
  }

  if (jobs.length === 0) {
    return (
      <View style={center}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "800",
            color: "#0F172A",
            marginBottom: 8,
          }}
        >
          No jobs posted yet
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#64748B",
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          Jobs you post will appear here. You can delete or renew them anytime.
        </Text>
      </View>
    );
  }

  /* =====================================================
     LIST
  ====================================================== */
  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FB" }}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 32,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        ListHeaderComponent={
          <Text
            style={{
              fontSize: 18,
              fontWeight: "800",
              color: "#0F172A",
              marginBottom: 16,
            }}
          >
            My jobs ({activeJobs.length} active)
          </Text>
        }
        renderItem={({ item }) => {
          const expired = new Date(item.expires_at) < now;

          return (
            <View style={card}>
              {/* TITLE */}
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: "#0F172A",
                  marginBottom: 4,
                }}
              >
                {item.title}
              </Text>

              {/* META */}
              <Text style={{ fontSize: 13, color: "#334155" }}>
                Pay: <Text style={{ fontWeight: "600" }}>{item.pay_type}</Text>
                {expired && (
                  <Text style={{ color: "#64748B", fontWeight: "700" }}>
                    {" "}
                    • Expired
                  </Text>
                )}
              </Text>

              <Text
                style={{
                  fontSize: 12,
                  color: "#64748B",
                  marginTop: 4,
                }}
              >
                Expires on {new Date(item.expires_at).toLocaleDateString()}
              </Text>

              {/* ACTIONS */}
              <View style={{ flexDirection: "row", marginTop: 14 }}>
                <Pressable
                  onPress={() => confirmDelete(item)}
                  disabled={deletingId === item.id}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "#DC2626",
                    opacity: deletingId === item.id ? 0.6 : 1,
                    marginRight: 10,
                  }}
                >
                  <Text
                    style={{
                      color: "#DC2626",
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    {deletingId === item.id ? "Deleting…" : "Delete"}
                  </Text>
                </Pressable>

                {expired && (
                  <Text
                    style={{
                      alignSelf: "center",
                      fontSize: 12,
                      color: "#94A3B8",
                    }}
                  >
                    Renewal coming soon
                  </Text>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

/* -------------------------------------------------------
   STYLES
-------------------------------------------------------- */
const center = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: 24,
};

const card = {
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  padding: 16,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: "#E5E7EB",
};
