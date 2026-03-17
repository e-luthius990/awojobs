import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../theme/useTheme";
import { AppText } from "./AppText";

export type AppToastTone = "success" | "info" | "warning" | "error";

export type AppToastProps = {
  visible: boolean;
  message: string;
  title?: string;
  tone?: AppToastTone;
  duration?: number;
  onHide?: () => void;
  action?: React.ReactNode;
  testID?: string;
};

export function AppToast({
  visible,
  message,
  title,
  tone = "info",
  duration = 2400,
  onHide,
  action,
  testID,
}: AppToastProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [mounted, setMounted] = useState(visible);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  const translateY = useRef(new Animated.Value(18)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.985)).current;

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const canDismiss = typeof onHide === "function";
  const isActionable = Boolean(action);

  const palette = useMemo(() => {
    switch (tone) {
      case "success":
        return {
          bg: theme.colors.successSoft,
          border: theme.colors.verifiedBorder,
          titleTone: "success" as const,
          iconColor: theme.colors.success,
          iconName: "checkmark-circle" as const,
        };
      case "warning":
        return {
          bg: theme.colors.warningSoft,
          border: theme.colors.warning,
          titleTone: "warning" as const,
          iconColor: theme.colors.warning,
          iconName: "alert-circle" as const,
        };
      case "error":
        return {
          bg: theme.colors.errorSoft,
          border: theme.colors.error,
          titleTone: "error" as const,
          iconColor: theme.colors.error,
          iconName: "close-circle" as const,
        };
      case "info":
      default:
        return {
          bg: theme.colors.infoSoft,
          border: theme.colors.sponsoredBorder,
          titleTone: "info" as const,
          iconColor: theme.colors.info,
          iconName: "information-circle" as const,
        };
    }
  }, [theme.colors, tone]);

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
    if (!visible || !message) return;

    AccessibilityInfo.announceForAccessibility?.(
      title ? `${title}. ${message}` : message,
    );
  }, [message, title, visible]);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const stopAnimation = useCallback(() => {
    animationRef.current?.stop();
    animationRef.current = null;
  }, []);

  const animateIn = useCallback(() => {
    stopAnimation();
    clearHideTimer();

    if (reduceMotionEnabled) {
      opacity.setValue(1);
      translateY.setValue(0);
      scale.setValue(1);
      return;
    }

    opacity.setValue(0);
    translateY.setValue(18);
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
  }, [
    clearHideTimer,
    opacity,
    reduceMotionEnabled,
    scale,
    stopAnimation,
    theme.motion.normal,
    translateY,
  ]);

  const animateOut = useCallback(() => {
    stopAnimation();
    clearHideTimer();

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
        toValue: 12,
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
  }, [
    clearHideTimer,
    opacity,
    reduceMotionEnabled,
    scale,
    stopAnimation,
    theme.motion.fast,
    translateY,
  ]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      animateIn();

      if (!isActionable && canDismiss && duration > 0) {
        hideTimerRef.current = setTimeout(() => {
          onHide?.();
        }, duration);
      }

      return () => {
        clearHideTimer();
        stopAnimation();
      };
    }

    animateOut();

    return () => {
      clearHideTimer();
      stopAnimation();
    };
  }, [
    animateIn,
    animateOut,
    canDismiss,
    clearHideTimer,
    duration,
    isActionable,
    onHide,
    stopAnimation,
    visible,
  ]);

  const wrapperStyle = useMemo<ViewStyle>(
    () => ({
      position: "absolute",
      left: theme.spacing.screenX,
      right: theme.spacing.screenX,
      bottom: Math.max(theme.spacing.xxl, insets.bottom + theme.spacing.md),
      zIndex: theme.zIndex.toast,
    }),
    [
      insets.bottom,
      theme.spacing.md,
      theme.spacing.screenX,
      theme.spacing.xxl,
      theme.zIndex.toast,
    ],
  );

  const toastStyle = useMemo<ViewStyle>(
    () => ({
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      backgroundColor: palette.bg,
      borderColor: palette.border,
      ...theme.shadows.level2,
    }),
    [
      palette.bg,
      palette.border,
      theme.radius.xl,
      theme.shadows.level2,
      theme.spacing.md,
    ],
  );

  const topRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "flex-start",
    }),
    [],
  );

  const iconWrapStyle = useMemo<ViewStyle>(
    () => ({
      width: 24,
      alignItems: "center",
      paddingTop: 1,
      marginRight: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const bodyRowStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    }),
    [],
  );

  const bodyStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
    }),
    [],
  );

  const messageStyle = useMemo<ViewStyle | undefined>(
    () => (title ? { marginTop: theme.spacing.xxs } : undefined),
    [theme.spacing.xxs, title],
  );

  const actionWrapStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const closeButtonStyle = useMemo<ViewStyle>(
    () => ({
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.bgSurface,
      borderWidth: theme.hairlineWidth,
      borderColor: theme.colors.borderMuted,
      marginLeft: theme.spacing.sm,
    }),
    [
      theme.colors.bgSurface,
      theme.colors.borderMuted,
      theme.hairlineWidth,
      theme.radius.pill,
      theme.spacing.sm,
    ],
  );

  if (!mounted) return null;

  return (
    <Animated.View
      testID={testID}
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
      style={[
        wrapperStyle,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <View style={toastStyle}>
        <View style={topRowStyle}>
          <View style={iconWrapStyle}>
            <Ionicons
              name={palette.iconName}
              size={20}
              color={palette.iconColor}
            />
          </View>

          <View style={bodyRowStyle}>
            <View style={bodyStyle}>
              {title ? (
                <AppText
                  variant="labelLg"
                  tone={palette.titleTone}
                  weight="700"
                >
                  {title}
                </AppText>
              ) : null}

              <AppText variant="bodySm" tone="secondary" style={messageStyle}>
                {message}
              </AppText>

              {action ? <View style={actionWrapStyle}>{action}</View> : null}
            </View>

            {canDismiss ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss message"
                onPress={onHide}
                style={({ pressed }) => [
                  closeButtonStyle,
                  pressed
                    ? { backgroundColor: theme.colors.buttonGhostBgPressed }
                    : null,
                ]}
              >
                <Ionicons
                  name="close"
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
