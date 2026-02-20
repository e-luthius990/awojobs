import React, { useEffect, useRef } from "react";
import { Text, StyleSheet, Pressable, Animated } from "react-native";

type Props = {
  count: number;
  visible: boolean;
  onPress(): void;
};

export function NewJobsBanner({ count, visible, onPress }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    if (!visible || count === 0) return;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, count]);

  if (!visible || count === 0) return null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${count} new job${count > 1 ? "s" : ""} available`}
        style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
      >
        <Text style={styles.text}>
          {count} new job
          {count > 1 ? "s" : ""} available
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    marginVertical: 8,
  },
  banner: {
    backgroundColor: "#0F172A",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
});
