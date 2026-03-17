import React, { useMemo } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../theme/useTheme";
import { AppCard } from "./AppCard";
import { AppText } from "./AppText";

export type EmptyStateProps = {
  title: string;
  message: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "muted" | "elevated";
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function EmptyState({
  title,
  message,
  icon,
  action,
  variant = "muted",
  style,
  testID,
}: EmptyStateProps) {
  const { theme } = useTheme();

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      justifyContent: "center",
      minHeight: 220,
      paddingVertical: theme.spacing.xxl,
    }),
    [theme.spacing.xxl],
  );

  const innerStyle = useMemo<ViewStyle>(
    () => ({
      width: "100%",
      maxWidth: 360,
      alignItems: "center",
    }),
    [],
  );

  const iconWrapStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.lg,
      alignItems: "center",
      justifyContent: "center",
    }),
    [theme.spacing.lg],
  );

  const textBlockStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      justifyContent: "center",
    }),
    [],
  );

  const messageStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: theme.spacing.xs,
      maxWidth: 320,
    }),
    [theme.spacing.xs],
  );

  const actionWrapStyle = useMemo<ViewStyle>(
    () => ({
      width: "100%",
      marginTop: theme.spacing.xl,
    }),
    [theme.spacing.xl],
  );

  return (
    <AppCard
      testID={testID}
      variant={variant}
      padding="lg"
      style={style}
      contentStyle={contentStyle}
    >
      <View style={innerStyle}>
        {icon ? <View style={iconWrapStyle}>{icon}</View> : null}

        <View style={textBlockStyle}>
          <AppText variant="titleLg" align="center">
            {title}
          </AppText>

          <AppText
            variant="bodySm"
            tone="secondary"
            align="center"
            style={messageStyle}
          >
            {message}
          </AppText>
        </View>

        {action ? <View style={actionWrapStyle}>{action}</View> : null}
      </View>
    </AppCard>
  );
}
