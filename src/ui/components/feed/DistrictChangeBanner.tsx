import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  View,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../../../theme/useTheme";
import { AppText } from "../../ui/AppText";
import { StatusBadge } from "../../ui/StatusBadge";

type Props = {
  districtName: string;
  visible: boolean;
  onHide: () => void;
};

export default function DistrictChangeBanner({
  districtName,
  visible,
  onHide,
}: Props) {
  const { theme } = useTheme();

  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (!visible) return;

    animationRef.current?.stop();
    animationRef.current = null;

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    translateY.setValue(-20);
    opacity.setValue(0);

    if (reduceMotionEnabled) {
      translateY.setValue(0);
      opacity.setValue(1);

      hideTimerRef.current = setTimeout(() => {
        onHide();
      }, 2200);

      return () => {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
      };
    }

    animationRef.current = Animated.sequence([
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: theme.motion.normal,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: theme.motion.normal,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(2200),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -12,
          duration: theme.motion.fast,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: theme.motion.fast,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);

    animationRef.current.start(({ finished }) => {
      animationRef.current = null;
      if (finished) {
        onHide();
      }
    });

    return () => {
      animationRef.current?.stop();
      animationRef.current = null;
      translateY.stopAnimation();
      opacity.stopAnimation();

      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [
    onHide,
    opacity,
    reduceMotionEnabled,
    theme.motion.fast,
    theme.motion.normal,
    translateY,
    visible,
  ]);

  const wrapperStyle = useMemo<ViewStyle>(
    () => ({
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: theme.zIndex.toast,
      paddingHorizontal: theme.spacing.screenX,
      paddingTop: theme.spacing.xs,
    }),
    [theme.spacing.screenX, theme.spacing.xs, theme.zIndex.toast],
  );

  const bannerStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: theme.colors.bgSurfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.xl,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      ...theme.shadows.level2,
    }),
    [
      theme.colors.bgSurfaceElevated,
      theme.colors.borderDefault,
      theme.radius.xl,
      theme.shadows.level2,
      theme.spacing.md,
      theme.spacing.sm,
    ],
  );

  const textWrapStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      gap: 2,
    }),
    [],
  );

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        wrapperStyle,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={bannerStyle}>
        <StatusBadge label="Location Updated" tone="info" />

        <View style={textWrapStyle}>
          <AppText variant="labelLg" weight="700">
            Now showing jobs for {districtName}
          </AppText>

          <AppText variant="caption" tone="secondary">
            Your feed has updated to match your current district.
          </AppText>
        </View>
      </View>
    </Animated.View>
  );
}
