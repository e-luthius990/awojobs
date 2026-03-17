import React, { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Props = {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  scaleFrom?: number;
};

export function AppEntrance({
  children,
  delay = 0,
  distance = 10,
  duration = 280,
  style,
  scaleFrom = 0.985,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;
  const scale = useRef(new Animated.Value(scaleFrom)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let active = true;

    const settleVisible = () => {
      opacity.setValue(1);
      translateY.setValue(0);
      scale.setValue(1);
    };

    const start = async () => {
      try {
        const reduceMotionEnabled =
          await AccessibilityInfo.isReduceMotionEnabled();

        if (!active) return;

        if (reduceMotionEnabled) {
          settleVisible();
          return;
        }

        animationRef.current?.stop();

        animationRef.current = Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]);

        animationRef.current.start(({ finished }) => {
          if (finished) {
            animationRef.current = null;
          }
        });
      } catch {
        if (!active) return;
        settleVisible();
      }
    };

    void start();

    return () => {
      active = false;
      animationRef.current?.stop();
      animationRef.current = null;
    };
    // Intentionally mount-only. App entrances should not replay on prop churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
