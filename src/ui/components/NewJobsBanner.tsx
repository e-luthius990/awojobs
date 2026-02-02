import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";

export function NewJobsBanner({
  count,
  onPress,
}: {
  count: number;
  onPress(): void;
}) {
  if (count === 0) return null;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Pressable onPress={onPress} style={styles.banner}>
        <Text style={styles.text}>
          {count} new job{count > 1 ? "s" : ""} available
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 14,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 30,
  },

  banner: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },

  text: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
});
