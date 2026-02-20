import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
  RefreshControl,
} from "react-native";
import * as Linking from "expo-linking";

import { fetchMyApplications } from "../../jobs/applications.service";
import { Application } from "../../jobs/applications.types";

/* ---------------------------------------------
   CONFIG
---------------------------------------------- */
const NEW_WINDOW_HOURS = 24;

/* ---------------------------------------------
   HELPERS
---------------------------------------------- */

function isNew(createdAt: string) {
  const created = new Date(createdAt).getTime();
  return Date.now() - created < NEW_WINDOW_HOURS * 60 * 60 * 1000;
}

function normalizeUgPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("256")) return `+${digits}`;
  if (digits.startsWith("0")) return `+256${digits.slice(1)}`;

  return `+256${digits}`;
}

function NewBadge() {
  return (
    <View style={styles.newBadge}>
      <Text style={styles.newText}>NEW</Text>
    </View>
  );
}

/* ---------------------------------------------
   SCREEN
---------------------------------------------- */

export default function ApplicationsInboxScreen() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchMyApplications();
      setApps(data);
    } catch {
      Alert.alert("Error", "Could not load applications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------------------------------------------
     DERIVED METRICS
  ---------------------------------------------- */

  const totalCount = apps.length;

  const newCount = useMemo(
    () => apps.filter((a) => isNew(a.created_at)).length,
    [apps],
  );

  /* ---------------------------------------------
     CONTACT ACTIONS
  ---------------------------------------------- */

  function call(phone: string) {
    Linking.openURL(`tel:${normalizeUgPhone(phone)}`);
  }

  function whatsapp(phone: string, name: string) {
    const msg = encodeURIComponent(
      `Hello ${name}, thank you for applying via AwoJobs.`,
    );
    Linking.openURL(
      `https://wa.me/${normalizeUgPhone(phone).replace("+", "")}?text=${msg}`,
    );
  }

  /* ---------------------------------------------
     LOADING
  ---------------------------------------------- */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading applications…</Text>
      </View>
    );
  }

  if (apps.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No applications yet</Text>
        <Text style={styles.emptySub}>
          When candidates apply to your jobs, they will appear here.
        </Text>
      </View>
    );
  }

  /* ---------------------------------------------
     UI
  ---------------------------------------------- */

  return (
    <View style={styles.container}>
      {/* SUMMARY HEADER */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Applications Inbox</Text>
        <Text style={styles.summaryMeta}>
          {totalCount} total • {newCount} new (24h)
        </Text>
      </View>

      <FlatList
        data={apps}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={({ item }) => {
          const showNew = isNew(item.created_at);

          return (
            <View style={styles.card}>
              {/* NAME + BADGE */}
              <View style={styles.rowBetween}>
                <View style={styles.row}>
                  <Text style={styles.name}>{item.applicant_name}</Text>
                  {showNew && <NewBadge />}
                </View>

                <Text style={styles.date}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>

              <Text style={styles.meta}>
                Applied via {item.source ?? "in-app"}
              </Text>

              {/* ACTIONS */}
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => call(item.applicant_phone)}
                  style={styles.callBtn}
                >
                  <Text style={styles.btnText}>Call</Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    whatsapp(item.applicant_phone, item.applicant_name)
                  }
                  style={styles.whatsappBtn}
                >
                  <Text style={styles.btnText}>WhatsApp</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

/* ---------------------------------------------
   STYLES
---------------------------------------------- */

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
  center: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 24,
  },
  muted: {
    marginTop: 8,
    color: "#64748B",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    marginBottom: 8,
  },
  emptySub: {
    color: "#64748B",
    textAlign: "center" as const,
  },
  summaryCard: {
    backgroundColor: "#0F172A",
    padding: 20,
  },
  summaryTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800" as const,
  },
  summaryMeta: {
    color: "#CBD5E1",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  rowBetween: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  name: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: "#0F172A",
  },
  meta: {
    fontSize: 13,
    color: "#475569",
    marginTop: 6,
  },
  date: {
    fontSize: 11,
    color: "#94A3B8",
  },
  actionRow: {
    flexDirection: "row" as const,
    marginTop: 14,
  },
  callBtn: {
    backgroundColor: "#0F172A",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    marginRight: 10,
  },
  whatsappBtn: {
    backgroundColor: "#16A34A",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700" as const,
  },
  newBadge: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  newText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800" as const,
  },
};
