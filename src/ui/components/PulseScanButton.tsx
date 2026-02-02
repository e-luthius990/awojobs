import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  Animated,
  View,
} from "react-native";

const COOLDOWN_SECONDS = 30;

export function PulseScanButton({
  onPress,
  loading,
  floating,
}: {
  onPress(): void;
  loading?: boolean;
  floating?: boolean;
}) {
  const idleScale = useRef(new Animated.Value(1)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  const [cooldown, setCooldown] = useState(0);

  /* ---------------------------------------------
     IDLE BREATHING (SUBTLE)
  ---------------------------------------------- */
  useEffect(() => {
    if (loading || cooldown > 0) {
      idleScale.stopAnimation();
      idleScale.setValue(1);
      return;
    }

    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(idleScale, {
          toValue: 1.03,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(idleScale, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );

    breathe.start();
    return () => breathe.stop();
  }, [loading, cooldown]);

  /* ---------------------------------------------
     SOFT RADAR RIPPLE (ACTIVE SCAN)
  ---------------------------------------------- */
  useEffect(() => {
    if (!loading) {
      ripple.stopAnimation();
      ripple.setValue(0);
      return;
    }

    const wave = Animated.loop(
      Animated.timing(ripple, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    );

    wave.start();
    return () => wave.stop();
  }, [loading]);

  const rippleScale = ripple.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });

  const rippleOpacity = ripple.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0],
  });

  /* ---------------------------------------------
     COOLDOWN TIMER
  ---------------------------------------------- */
  useEffect(() => {
    if (cooldown <= 0) return;

    const t = setInterval(() => {
      setCooldown((c) => c - 1);
    }, 1000);

    return () => clearInterval(t);
  }, [cooldown]);

  /* ---------------------------------------------
     PRESS FEEDBACK
  ---------------------------------------------- */
  function pressIn() {
    Animated.timing(pressScale, {
      toValue: 0.96,
      duration: 80,
      useNativeDriver: true,
    }).start();
  }

  function pressOut() {
    Animated.timing(pressScale, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  }

  function handlePress() {
    if (loading || cooldown > 0) return;
    onPress();
    setCooldown(COOLDOWN_SECONDS);
  }

  const disabled = loading || cooldown > 0;

  return (
    <View
      style={{
        position: floating ? "absolute" : "relative",
        bottom: floating ? 28 : undefined,
        right: floating ? 20 : undefined,
        zIndex: 20,
      }}
    >
      {/* SOFT RIPPLE */}
      {loading && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -20,
            left: -20,
            right: -20,
            bottom: -20,
            borderRadius: 999,
            borderWidth: 1.5,
            borderColor: "#0F172A",
            opacity: rippleOpacity,
            transform: [{ scale: rippleScale }],
          }}
        />
      )}

      <Animated.View
        style={{
          transform: [{ scale: idleScale }, { scale: pressScale }],
        }}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={pressIn}
          onPressOut={pressOut}
          disabled={disabled}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 999,
            backgroundColor: "#0F172A",
            opacity: disabled ? 0.8 : 1,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 },
          }}
        >
          {loading ? (
            <>
              <ActivityIndicator color="white" />
              <Text
                style={{
                  color: "white",
                  fontWeight: "700",
                  marginLeft: 10,
                }}
              >
                Scanning…
              </Text>
            </>
          ) : cooldown > 0 ? (
            <Text style={{ color: "white", fontWeight: "700" }}>
              Scan again in {cooldown}s
            </Text>
          ) : (
            <Text style={{ color: "white", fontWeight: "800" }}>
              Scan my area
            </Text>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}
