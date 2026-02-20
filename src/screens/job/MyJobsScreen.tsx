import React, { useEffect, useMemo, useState, useCallback } from "react";
import * as Haptics from "expo-haptics";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  ToastAndroid,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { fetchMyJobs, deleteJob } from "../../jobs/jobs.mine";

/* =====================================================
   TYPES
===================================================== */
type EmployerJob = {
  id: string;
  title: string;
  description: string | null;
  pay_type: "daily" | "weekly" | "monthly";
  location_id: string;
  employer_id: string;
  contact_method: "call" | "whatsapp" | "walk_in" | "in_app";
  contact_phone: string | null;
  is_sponsored: boolean;
  sponsored_until: string | null;
  expires_at: string;
  created_at: string;
  applications_count: number;
  last_application_at: string | null;
};

type Props = {
  navigation: any;
};

/* =====================================================
   HELPERS
===================================================== */
const NEW_WINDOW_HOURS = 24;

function isNew(date?: string | null) {
  if (!date) return false;
  return (
    Date.now() - new Date(date).getTime() < NEW_WINDOW_HOURS * 60 * 60 * 1000
  );
}

/* =====================================================
   SCREEN
===================================================== */
export default function MyJobsScreen({ navigation }: Props) {
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* =====================================================
     LOAD
  ====================================================== */
  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);

    try {
      const data = await fetchMyJobs();
      setJobs(data);
    } catch {
      Alert.alert("Error", "Could not load your jobs.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  }

  const activeJobs = useMemo(() => {
    const now = Date.now();
    return jobs.filter((j) => new Date(j.expires_at).getTime() > now);
  }, [jobs]);

  /* =====================================================
     DELETE
  ====================================================== */
  function confirmDelete(job: EmployerJob) {
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

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (Platform.OS === "android") {
        ToastAndroid.show("Job deleted", ToastAndroid.SHORT);
      }
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      Alert.alert("Failed", "Could not delete job.");
    } finally {
      setDeletingId(null);
    }
  }

  /* =====================================================
     LOADING STATE
  ====================================================== */
  if (loading) {
    return (
      <View style={center}>
        <ActivityIndicator />
        <Text style={subtle}>Loading your jobs…</Text>
      </View>
    );
  }

  /* =====================================================
     EMPTY STATE
  ====================================================== */
  if (jobs.length === 0) {
    return (
      <View style={center}>
        <Text style={title}>No jobs posted yet</Text>
        <Text style={subtleCentered}>
          Jobs you post will appear here. You can edit, renew, or delete them
          anytime.
        </Text>

        <Pressable
          onPress={() => navigation.navigate("PostJobFlow")}
          style={primaryButton}
        >
          <Text style={primaryText}>＋ Post your first job</Text>
        </Pressable>
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
        initialNumToRender={8}
        windowSize={5}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 32,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        ListHeaderComponent={
          <View style={header}>
            <Text style={headerTitle}>
              My jobs ({activeJobs.length} active, {jobs.length} total)
            </Text>

            <Pressable
              onPress={() => navigation.navigate("PostJobFlow")}
              style={headerButton}
            >
              <Text style={headerButtonText}>＋ Post Job</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const now = Date.now();
          const expired = new Date(item.expires_at).getTime() <= now;

          const sponsoredActive =
            item.is_sponsored &&
            item.sponsored_until &&
            new Date(item.sponsored_until).getTime() > now;

          const apps = item.applications_count ?? 0;
          const showNew = isNew(item.last_application_at);

          return (
            <View style={card}>
              <Text style={jobTitle}>{item.title}</Text>

              {sponsoredActive && (
                <Text style={sponsoredText}>
                  Sponsored until{" "}
                  {new Date(item.sponsored_until!).toLocaleDateString()}
                </Text>
              )}

              <Text style={metaText}>
                Pay: <Text style={{ fontWeight: "600" }}>{item.pay_type}</Text>
                {expired && <Text style={expiredText}> • Expired</Text>}
              </Text>

              <Text style={subtle}>
                Expires on {new Date(item.expires_at).toLocaleDateString()}
              </Text>

              {apps > 0 && (
                <View style={appRow}>
                  <View style={appBadge}>
                    <Text style={appBadgeText}>
                      {apps} application
                      {apps > 1 ? "s" : ""}
                    </Text>
                  </View>

                  {showNew && (
                    <View style={newBadge}>
                      <Text style={newBadgeText}>NEW</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={actionRow}>
                <Pressable
                  disabled={sponsoredActive}
                  onPress={() => {
                    if (sponsoredActive) {
                      Alert.alert(
                        "Sponsored Job",
                        "You cannot edit this job while sponsorship is active.",
                      );
                      return;
                    }

                    navigation.navigate("PostJobFlow", {
                      screen: "PostJob",
                      params: {
                        job: item,
                        jobId: item.id,
                        mode: expired ? "renew" : "edit",
                      },
                    });
                  }}
                  style={[
                    editButton,
                    sponsoredActive && {
                      opacity: 0.5,
                    },
                  ]}
                >
                  <Text style={editText}>{expired ? "Renew" : "Edit"}</Text>
                </Pressable>

                <Pressable
                  disabled={deletingId === item.id || sponsoredActive}
                  onPress={() => {
                    if (sponsoredActive) {
                      Alert.alert(
                        "Sponsored Job",
                        "You cannot delete a job while sponsorship is active.",
                      );
                      return;
                    }

                    confirmDelete(item);
                  }}
                  style={[
                    deleteButton,
                    (deletingId === item.id || sponsoredActive) && {
                      opacity: 0.6,
                    },
                  ]}
                >
                  <Text style={deleteText}>
                    {deletingId === item.id ? "Deleting…" : "Delete"}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const center = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: 24,
};

const title = {
  fontSize: 18,
  fontWeight: "800" as const,
  color: "#0F172A",
  marginBottom: 8,
};

const subtle = {
  fontSize: 14,
  color: "#64748B",
  marginTop: 8,
};

const subtleCentered = {
  fontSize: 14,
  color: "#64748B",
  textAlign: "center" as const,
  marginBottom: 16,
};

const primaryButton = {
  backgroundColor: "#0F172A",
  paddingVertical: 12,
  paddingHorizontal: 24,
  borderRadius: 999,
};

const primaryText = {
  color: "#fff",
  fontWeight: "700" as const,
};

const header = {
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
  alignItems: "center" as const,
  marginBottom: 16,
};

const headerTitle = {
  fontSize: 18,
  fontWeight: "800" as const,
  color: "#0F172A",
};

const headerButton = {
  backgroundColor: "#0F172A",
  paddingVertical: 8,
  paddingHorizontal: 14,
  borderRadius: 999,
};

const headerButtonText = {
  color: "#fff",
  fontWeight: "700" as const,
};

const card = {
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  padding: 16,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: "#E5E7EB",
};

const jobTitle = {
  fontSize: 15,
  fontWeight: "700" as const,
  color: "#0F172A",
  marginBottom: 4,
};

const sponsoredText = {
  fontSize: 12,
  fontWeight: "700" as const,
  color: "#2563EB",
  marginBottom: 6,
};

const metaText = {
  fontSize: 13,
  color: "#334155",
};

const expiredText = {
  color: "#64748B",
  fontWeight: "700" as const,
};

const appRow = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  marginTop: 10,
};

const appBadge = {
  backgroundColor: "#EEF2FF",
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 999,
  marginRight: 8,
};

const appBadgeText = {
  fontSize: 12,
  fontWeight: "700" as const,
  color: "#3730A3",
};

const newBadge = {
  backgroundColor: "#DC2626",
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 6,
};

const newBadgeText = {
  color: "#fff",
  fontSize: 10,
  fontWeight: "800" as const,
};

const actionRow = {
  flexDirection: "row" as const,
  marginTop: 14,
};

const editButton = {
  paddingVertical: 6,
  paddingHorizontal: 14,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: "#0F172A",
  marginRight: 10,
};

const editText = {
  color: "#0F172A",
  fontWeight: "700" as const,
  fontSize: 13,
};

const deleteButton = {
  paddingVertical: 6,
  paddingHorizontal: 14,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: "#DC2626",
};

const deleteText = {
  color: "#DC2626",
  fontWeight: "700" as const,
  fontSize: 13,
};
