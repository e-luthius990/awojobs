import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../theme/useTheme";

let reduceMotionCachedValue: boolean | null = null;
let reduceMotionPromise: Promise<boolean> | null = null;

async function getReduceMotionEnabled(): Promise<boolean> {
  if (reduceMotionCachedValue !== null) {
    return reduceMotionCachedValue;
  }

  if (!reduceMotionPromise) {
    reduceMotionPromise = AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        reduceMotionCachedValue = enabled;
        return enabled;
      })
      .catch(() => {
        reduceMotionCachedValue = false;
        return false;
      });
  }

  return reduceMotionPromise;
}

type SkeletonBaseProps = {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  animated?: boolean;
  testID?: string;
};

function SkeletonBase({
  width = "100%",
  height,
  radius,
  style,
  animated = true,
  testID,
}: SkeletonBaseProps) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.72)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(
    reduceMotionCachedValue ?? false,
  );

  useEffect(() => {
    let active = true;

    void getReduceMotionEnabled().then((enabled) => {
      if (active) {
        setReduceMotionEnabled(enabled);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    loopRef.current?.stop();
    loopRef.current = null;

    if (!animated || reduceMotionEnabled) {
      opacity.setValue(1);
      return;
    }

    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.96,
          duration: theme.motion.slow,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.72,
          duration: theme.motion.slow,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );

    loopRef.current.start();

    return () => {
      loopRef.current?.stop();
      loopRef.current = null;
      opacity.stopAnimation();
    };
  }, [animated, opacity, reduceMotionEnabled, theme.motion.slow]);

  return (
    <Animated.View
      testID={testID}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.md,
          backgroundColor: theme.colors.bgSurfaceSunken,
          opacity: animated && !reduceMotionEnabled ? opacity : 1,
        },
        style,
      ]}
    />
  );
}

export type SkeletonLineProps = Omit<SkeletonBaseProps, "height"> & {
  height?: number;
};

export function SkeletonLine({ height = 14, ...rest }: SkeletonLineProps) {
  return <SkeletonBase height={height} {...rest} />;
}

export type SkeletonCircleProps = Omit<
  SkeletonBaseProps,
  "height" | "width"
> & {
  size?: number;
};

export function SkeletonCircle({
  size = 40,
  radius,
  ...rest
}: SkeletonCircleProps) {
  return (
    <SkeletonBase
      width={size}
      height={size}
      radius={radius ?? size / 2}
      {...rest}
    />
  );
}

export type SkeletonCardProps = {
  lines?: number;
  showCircle?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function SkeletonCard({
  lines = 3,
  showCircle = false,
  style,
  testID,
}: SkeletonCardProps) {
  const { theme } = useTheme();

  const lineIndexes = useMemo(
    () => Array.from({ length: lines }, (_, i) => i),
    [lines],
  );

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radius.xl,
      borderWidth: theme.hairlineWidth,
      borderColor: theme.colors.borderDefault,
      padding: theme.spacing.md,
    }),
    [
      theme.colors.bgSurface,
      theme.colors.borderDefault,
      theme.hairlineWidth,
      theme.radius.xl,
      theme.spacing.md,
    ],
  );

  const headerRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const textHeaderWrapStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      marginLeft: showCircle ? theme.spacing.sm : 0,
    }),
    [showCircle, theme.spacing.sm],
  );

  const stackedGapStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const linesGroupStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const footerRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
    }),
    [],
  );

  const footerFirstButtonStyle = useMemo<ViewStyle>(
    () => ({
      marginRight: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  return (
    <View
      testID={testID}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[containerStyle, style]}
    >
      <View style={headerRowStyle}>
        {showCircle ? <SkeletonCircle size={42} /> : null}

        <View style={textHeaderWrapStyle}>
          <SkeletonLine
            width="74%"
            height={18}
            radius={theme.radius.sm}
            style={stackedGapStyle}
          />
          <SkeletonLine width="46%" height={13} radius={theme.radius.sm} />
        </View>
      </View>

      <View style={linesGroupStyle}>
        {lineIndexes.map((index) => (
          <SkeletonLine
            key={index}
            width={index === lineIndexes.length - 1 ? "70%" : "100%"}
            height={14}
            radius={theme.radius.sm}
            style={index < lineIndexes.length - 1 ? stackedGapStyle : undefined}
          />
        ))}
      </View>

      <View style={footerRowStyle}>
        <SkeletonLine
          width={96}
          height={34}
          radius={theme.radius.pill}
          style={footerFirstButtonStyle}
        />
        <SkeletonLine width={88} height={34} radius={theme.radius.pill} />
      </View>
    </View>
  );
}
