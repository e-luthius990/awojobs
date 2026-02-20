import React from "react";
import { View, StyleSheet } from "react-native";

export function JobCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.title} />
      <View style={styles.meta} />
      <View style={styles.pay} />
      <View style={styles.cta} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    overflow: "hidden",
  },

  title: {
    height: 18,
    width: "72%",
    backgroundColor: "#E8EAED",
    borderRadius: 8,
  },

  meta: {
    height: 13,
    width: "46%",
    backgroundColor: "#E8EAED",
    borderRadius: 8,
    marginTop: 10,
  },

  pay: {
    height: 14,
    width: "55%",
    backgroundColor: "#E8EAED",
    borderRadius: 8,
    marginTop: 14,
  },

  cta: {
    height: 36,
    width: 120,
    backgroundColor: "#E8EAED",
    borderRadius: 999,
    marginTop: 16,
  },
});
