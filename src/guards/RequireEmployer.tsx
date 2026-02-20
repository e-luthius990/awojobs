import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { useSession } from "../state/useSession";
import { useProfile } from "../state/useProfile";

/**
 * Guard: Employer-only access
 * DB-authoritative enforcement
 */
export function RequireEmployer({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation<any>();
  const { session, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;

  const { profile, loading: profileLoading } = useProfile(userId);

  const goToLogin = useCallback(() => {
    navigation.navigate("PostJobTab"); // PostJob tab = Login
  }, [navigation]);

  const goToFeed = useCallback(() => {
    navigation.navigate("FeedTab");
  }, [navigation]);

  /* ---------------- HYDRATION ---------------- */

  if (sessionLoading || profileLoading) {
    return <View style={styles.skeleton} />;
  }

  /* ---------------- NOT AUTHENTICATED ---------------- */

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Sign in required</Text>
        <Text style={styles.subtitle}>
          Please login as an employer to continue.
        </Text>

        <Pressable onPress={goToLogin} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Login</Text>
        </Pressable>

        <Pressable onPress={goToFeed}>
          <Text style={styles.secondaryText}>Back to jobs</Text>
        </Pressable>
      </View>
    );
  }

  /* ---------------- PROFILE ERROR ---------------- */

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Profile unavailable</Text>
        <Text style={styles.subtitle}>We couldn’t load your profile.</Text>

        <Pressable onPress={goToFeed} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Back to Jobs</Text>
        </Pressable>
      </View>
    );
  }

  /* ---------------- NOT EMPLOYER ---------------- */

  if (profile.role !== "employer") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Employer access only</Text>
        <Text style={styles.subtitle}>
          Only employer accounts can post jobs or manage applications.
        </Text>

        <Pressable onPress={goToLogin} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Login as Employer</Text>
        </Pressable>

        <Pressable onPress={goToFeed}>
          <Text style={styles.secondaryText}>Back to jobs</Text>
        </Pressable>
      </View>
    );
  }

  /* ---------------- AUTHORIZED ---------------- */

  return <>{children}</>;
}

const styles = StyleSheet.create({
  skeleton: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: "#111",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  primaryText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
  secondaryText: {
    textAlign: "center",
    opacity: 0.8,
  },
});
