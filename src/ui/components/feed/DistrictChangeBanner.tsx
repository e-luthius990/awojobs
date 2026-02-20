import React, { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

export default function DistrictChangeBanner({
  districtName,
  visible,
  onHide,
}: {
  districtName: string;
  visible: boolean;
  onHide: () => void;
}) {
  const slide = useRef(new Animated.Value(-80)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!visible) return;

    slide.setValue(-80);

    animationRef.current = Animated.sequence([
      Animated.timing(slide, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(slide, {
        toValue: -80,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);

    animationRef.current.start(() => {
      onHide();
    });

    return () => {
      animationRef.current?.stop();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        transform: [{ translateY: slide }],
        backgroundColor: "#0F172A",
        padding: 14,
        zIndex: 100,
      }}
    >
      <Text
        style={{
          color: "#FFF",
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        📍 You moved to {districtName}
      </Text>
    </Animated.View>
  );
}
