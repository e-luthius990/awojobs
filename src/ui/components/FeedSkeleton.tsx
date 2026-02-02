import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export function FeedSkeleton({ count = 5 }: { count?: number }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      }),
    ).start();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          {/* ATMOSPHERIC TOP WASH (matches JobCard mood) */}
          <View style={styles.topWash} />

          {/* TITLE */}
          <View style={styles.row}>
            <View style={styles.titleBlock} />
          </View>

          {/* META */}
          <View style={styles.row}>
            <View style={styles.metaBlock} />
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <View style={styles.badge} />
            <View style={styles.action} />
          </View>

          {/* SHIMMER OVERLAY */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shimmer,
              {
                transform: [{ translateX }],
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

/* ======================================================
   STYLES (LOCKED)
====================================================== */
const styles = StyleSheet.create({
  card: {
    position: "relative",
    backgroundColor: "#F4F5F7", // soft canvas-like surface
    borderRadius: 20, // matches JobCard
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

  row: {
    marginBottom: 10,
  },

  titleBlock: {
    height: 18,
    width: "72%",
    borderRadius: 8,
    backgroundColor: "#E1E4E8",
  },

  metaBlock: {
    height: 14,
    width: "48%",
    borderRadius: 8,
    backgroundColor: "#E1E4E8",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },

  badge: {
    height: 22,
    width: 92,
    borderRadius: 999,
    backgroundColor: "#E1E4E8",
  },

  action: {
    height: 34,
    width: 84,
    borderRadius: 999, // echoes CTA pill
    backgroundColor: "#E1E4E8",
  },

  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    width: "35%", // calmer, more liquid
    backgroundColor: "rgba(255,255,255,0.35)",
  },
});
