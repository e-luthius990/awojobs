import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";

type LaunchScreenProps = {
  onReady?: () => void;
};

const ICON_SIZE = 200;
const ICON_FADE_MS = 180;
const WORDMARK_FADE_MS = 220;
const WORDMARK_RISE_MS = 260;
const WORDMARK_DELAY_MS = 90;

export default function LaunchScreen({ onReady }: LaunchScreenProps) {
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkTranslateY = useRef(new Animated.Value(14)).current;
  const readyCalledRef = useRef(false);

  useEffect(() => {
    const iconAnim = Animated.timing(iconOpacity, {
      toValue: 1,
      duration: ICON_FADE_MS,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    });

    const wordmarkAnim = Animated.parallel([
      Animated.timing(wordmarkOpacity, {
        toValue: 1,
        duration: WORDMARK_FADE_MS,
        delay: WORDMARK_DELAY_MS,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(wordmarkTranslateY, {
        toValue: 0,
        duration: WORDMARK_RISE_MS,
        delay: WORDMARK_DELAY_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    Animated.sequence([iconAnim, wordmarkAnim]).start(({ finished }) => {
      if (finished && !readyCalledRef.current) {
        readyCalledRef.current = true;
        onReady?.();
      }
    });
  }, [iconOpacity, wordmarkOpacity, wordmarkTranslateY, onReady]);

  return (
    <View style={styles.container}>
      <View style={styles.centerBlock}>
        <Animated.Image
          source={require("../../assets/splash-icon.png")}
          resizeMode="contain"
          fadeDuration={0}
          style={[
            styles.icon,
            {
              opacity: iconOpacity,
            },
          ]}
          accessible
          accessibilityRole="image"
          accessibilityLabel="AwoJobs"
        />

        <Animated.View
          style={[
            styles.wordmarkWrap,
            {
              opacity: wordmarkOpacity,
              transform: [{ translateY: wordmarkTranslateY }],
            },
          ]}
        >
          <Text style={styles.wordmark}>
            <Text style={styles.awo}>Awo</Text>
            <Text style={styles.jobs}>Jobs</Text>
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  centerBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    transform: [{ translateY: -28 }],
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    marginBottom: -34,
  },
  wordmarkWrap: {
    marginTop: -6,
  },
  wordmark: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -0.9,
  },
  awo: {
    color: "#FF6A00",
  },
  jobs: {
    color: "#0B4D8C",
  },
});
