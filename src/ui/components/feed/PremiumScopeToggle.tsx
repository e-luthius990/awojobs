import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  LayoutChangeEvent,
} from "react-native";

type Scope = "district" | "national";

type Props = {
  isPremium: boolean;
  scope: Scope;
  setScope: (v: Scope) => void;
};

export default function PremiumScopeToggle({
  isPremium,
  scope,
  setScope,
}: Props) {
  if (!isPremium) return null;

  const anim = useRef(new Animated.Value(scope === "district" ? 0 : 1)).current;
  const [containerWidth, setContainerWidth] = useState(0);

  const segmentWidth = containerWidth / 2;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: scope === "district" ? 0 : 1,
      duration: 220,
      useNativeDriver: true, // ✅ FIXED
    }).start();
  }, [scope]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, segmentWidth || 0],
  });

  function onLayout(e: LayoutChangeEvent) {
    setContainerWidth(e.nativeEvent.layout.width);
  }

  return (
    <View
      onLayout={onLayout}
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: "#EEF2FF",
        borderRadius: 999,
        padding: 4,
        flexDirection: "row",
        position: "relative",
      }}
    >
      {segmentWidth > 0 && (
        <Animated.View
          style={{
            position: "absolute",
            width: segmentWidth,
            height: 36,
            borderRadius: 999,
            backgroundColor: "#2563EB",
            transform: [{ translateX }],
          }}
        />
      )}

      {(["district", "national"] as Scope[]).map((value) => (
        <Pressable
          key={value}
          onPress={() => setScope(value)}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            height: 36,
          }}
        >
          <Text
            style={{
              fontWeight: "700",
              color: scope === value ? "#FFF" : "#1E3A8A",
            }}
          >
            {value === "district" ? "Local" : "Nationwide"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
