import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

type Props = {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
  onChangeLocation?: () => void;
};

export function EmptyState({
  title = "No jobs right now",
  subtitle = "There are no jobs available for this location yet. Check again later or try another area.",
  onRetry,
  onChangeLocation,
}: Props) {
  return (
    <View style={styles.container}>
      {/* ATMOSPHERIC SURFACE */}
      <View style={styles.surface}>
        {/* Soft top wash (same language as JobCard) */}
        <View style={styles.topWash} />

        {/* CONTENT */}
        <Text style={styles.title}>{title}</Text>

        <Text style={styles.subtitle}>{subtitle}</Text>

        {/* ACTIONS */}
        <View style={styles.actions}>
          {onRetry && (
            <Pressable onPress={onRetry} style={styles.primaryAction}>
              <Text style={styles.primaryText}>Refresh</Text>
            </Pressable>
          )}

          {onChangeLocation && (
            <Pressable
              onPress={onChangeLocation}
              style={styles.secondaryAction}
            >
              <Text style={styles.secondaryText}>Change location</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

/* ======================================================
   STYLES (LOCKED)
====================================================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  surface: {
    position: "relative",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },

  /* Signature atmospheric hint */
  topWash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 52,
    backgroundColor: "#F3F4F6",
    opacity: 0.5,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
    textAlign: "center",
    marginBottom: 24,
  },

  actions: {
    gap: 12,
  },

  primaryAction: {
    backgroundColor: "#0F172A",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
  },

  primaryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  secondaryAction: {
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  secondaryText: {
    color: "#0F172A",
    fontWeight: "600",
    fontSize: 14,
  },
});
