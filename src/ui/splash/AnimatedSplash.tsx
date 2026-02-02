import { useEffect, useRef } from "react";
import { View, Image, Text, StyleSheet, Animated, Easing } from "react-native";
import * as SplashScreen from "expo-splash-screen";

/* ---------------------------------------
   COMPONENT
---------------------------------------- */
export function AnimatedSplash({ onFinish }: { onFinish(): void }) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SplashScreen.hideAsync();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 550,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 350,
        delay: 120,
        useNativeDriver: true,
      }),
    ]).start();

    const t = setTimeout(onFinish, 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      {/* Ambient glow */}
      <View style={styles.glow} />

      {/* Logo */}
      <Animated.View
        style={{
          opacity,
          transform: [{ scale }, { translateY }],
        }}
      >
        <View style={styles.logoCard}>
          <Image
            source={require("../../../assets/splash.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Jobs near you
      </Animated.Text>
    </View>
  );
}

/* ---------------------------------------
   STYLES
---------------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  glow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: "#E0F2FE",
    opacity: 0.55,
    top: "32%",
  },

  logoCard: {
    width: 140,
    height: 140,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },

  logo: {
    width: 90,
    height: 90,
  },

  tagline: {
    marginTop: 22,
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 0.4,
  },
});
