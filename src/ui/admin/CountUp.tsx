import React, { useEffect, useRef, useState } from "react";
import { Text, type TextStyle, type StyleProp } from "react-native";

type Props = {
  value: number;
  duration?: number;
  formatter?: (v: number) => string;
  style?: StyleProp<TextStyle>;
};

export default function CountUp({
  value,
  duration = 800,
  formatter,
  style,
}: Props) {
  const [display, setDisplay] = useState(0);

  const fromValueRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    fromValueRef.current = display;
    startRef.current = null;

    const toValue = Number.isFinite(value) ? value : 0;

    const animate = (timestamp: number) => {
      if (startRef.current === null) {
        startRef.current = timestamp;
      }

      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);

      const nextValue = Math.floor(
        fromValueRef.current + (toValue - fromValueRef.current) * progress,
      );

      setDisplay(nextValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(toValue);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, duration]);

  return (
    <Text style={style}>
      {formatter ? formatter(display) : display.toLocaleString()}
    </Text>
  );
}
