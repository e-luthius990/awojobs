import React from "react";
import { View, StyleSheet } from "react-native";

export function JobCardSkeleton() {
  return (
    <View style={styles.card}>
      {/* Atmospheric top wash (signature) */}
      <View style={styles.topWash} />

      {/* Title */}
      <View style={styles.title} />

      {/* Meta */}
      <View style={styles.meta} />

      {/* Pay */}
      <View style={styles.pay} />

      {/* CTA */}
      <View style={styles.cta} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    backgroundColor: "#F4F5F7",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    overflow: "hidden",
  },

  /* Signature atmospheric hint */
  topWash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: "#FFFFFF",
    opacity: 0.35,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  title: {
    height: 18,
    width: "72%",
    backgroundColor: "#E1E4E8",
    borderRadius: 8,
  },

  meta: {
    height: 13,
    width: "46%",
    backgroundColor: "#E1E4E8",
    borderRadius: 8,
    marginTop: 10,
  },

  pay: {
    height: 14,
    width: "55%",
    backgroundColor: "#E1E4E8",
    borderRadius: 8,
    marginTop: 14,
  },

  cta: {
    height: 36,
    width: 120,
    backgroundColor: "#E1E4E8",
    borderRadius: 999,
    marginTop: 16,
  },
});
