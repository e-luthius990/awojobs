import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../theme/useTheme";
import { AppText } from "../../ui/AppText";

type Props = {
  count: number;
  visible: boolean;
  onPress(): void;
};

export function NewJobsBanner({ count, visible, onPress }: Props) {
  const { theme } = useTheme();

  const [mounted, setMounted] = useState(visible && count > 0);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;
  const scale = useRef(new Animated.Value(0.985)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotionEnabled(enabled);
      })
      .catch(() => {
        if (active) setReduceMotionEnabled(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    animationRef.current?.stop();
    animationRef.current = null;

    if (visible && count > 0) {
      setMounted(true);

      if (reduceMotionEnabled) {
        opacity.setValue(1);
        translateY.setValue(0);
        scale.setValue(1);
        return;
      }

      opacity.setValue(0);
      translateY.setValue(-10);
      scale.setValue(0.985);

      animationRef.current = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: theme.motion.normal,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: theme.motion.normal,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: theme.motion.normal,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

      animationRef.current.start(({ finished }) => {
        if (finished) {
          animationRef.current = null;
        }
      });

      return () => {
        animationRef.current?.stop();
        animationRef.current = null;
      };
    }

    if (mounted) {
      if (reduceMotionEnabled) {
        setMounted(false);
        return;
      }

      animationRef.current = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: theme.motion.fast,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -8,
          duration: theme.motion.fast,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.99,
          duration: theme.motion.fast,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

      animationRef.current.start(({ finished }) => {
        animationRef.current = null;
        if (finished) {
          setMounted(false);
        }
      });
    }

    return () => {
      animationRef.current?.stop();
      animationRef.current = null;
      opacity.stopAnimation();
      translateY.stopAnimation();
      scale.stopAnimation();
    };
  }, [
    count,
    mounted,
    opacity,
    reduceMotionEnabled,
    scale,
    theme.motion.fast,
    theme.motion.normal,
    translateY,
    visible,
  ]);

  const wrapperStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      marginVertical: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const bannerStyle = useMemo<ViewStyle>(
    () => ({
      minHeight: 44,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      ...theme.shadows.level1,
    }),
    [
      theme.colors.primary,
      theme.radius.pill,
      theme.shadows.level1,
      theme.spacing.xs,
    ],
  );

  const iconWrapStyle = useMemo<ViewStyle>(
    () => ({
      width: 20,
      alignItems: "center",
      justifyContent: "center",
    }),
    [],
  );

  if (!mounted || count === 0) return null;

  return (
    <Animated.View
      style={[
        wrapperStyle,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${count} new job${count > 1 ? "s" : ""} available`}
        style={({ pressed }) => [
          bannerStyle,
          pressed ? { opacity: 0.92 } : null,
        ]}
      >
        <View style={iconWrapStyle}>
          <Ionicons
            name="sparkles-outline"
            size={16}
            color={theme.colors.primaryTextOnColor}
          />
        </View>

        <AppText variant="labelLg" tone="inverse" weight="700">
          {count} new job{count > 1 ? "s" : ""} available
        </AppText>
      </Pressable>
    </Animated.View>
  );
}
