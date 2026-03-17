import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, { Polyline } from "react-native-svg";

import { useTheme } from "../../theme/useTheme";

type Props = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  inset?: number;
};

export default function Sparkline({
  data,
  width = 120,
  height = 40,
  color,
  strokeWidth = 2,
  inset = 2,
}: Props) {
  const { theme } = useTheme();

  const strokeColor = color ?? theme.colors.primary;

  const safeData = useMemo(
    () =>
      Array.isArray(data) ? data.filter((value) => Number.isFinite(value)) : [],
    [data],
  );

  const points = useMemo(() => {
    if (safeData.length === 0) return "";

    const max = Math.max(...safeData);
    const min = Math.min(...safeData);
    const range = max - min || 1;

    const innerWidth = Math.max(width - inset * 2, 1);
    const innerHeight = Math.max(height - inset * 2, 1);

    if (safeData.length === 1) {
      const y = inset + innerHeight / 2;
      return `${inset},${y} ${inset + innerWidth},${y}`;
    }

    return safeData
      .map((value, index) => {
        const x = inset + (index / (safeData.length - 1)) * innerWidth;
        const y = inset + (innerHeight - ((value - min) / range) * innerHeight);

        return `${x},${y}`;
      })
      .join(" ");
  }, [safeData, width, height, inset]);

  if (!points) return null;

  return (
    <View pointerEvents="none">
      <Svg width={width} height={height}>
        <Polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
