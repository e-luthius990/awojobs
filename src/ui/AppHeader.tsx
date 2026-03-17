import React, { useMemo } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../theme/useTheme";
import { AppText } from "./AppText";

export type AppHeaderProps = {
  title: string;
  subtitle?: string;
  onBackPress?: (() => void) | null;
  rightAction?: React.ReactNode;
  leftAction?: React.ReactNode;
  compact?: boolean;
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function AppHeader({
  title,
  subtitle,
  onBackPress,
  rightAction,
  leftAction,
  compact = false,
  bordered = false,
  style,
  testID,
}: AppHeaderProps) {
  const { theme } = useTheme();

  const iconSize = compact ? 20 : 22;
  const actionSize = compact ? 40 : 44;
  const verticalPadding = compact ? theme.spacing.xs : theme.spacing.sm;
  const hasLeading = Boolean(leftAction || onBackPress);

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: theme.layout.appHeaderHeight,
      paddingVertical: verticalPadding,
      borderBottomWidth: bordered ? theme.hairlineWidth : 0,
      borderBottomColor: theme.colors.borderMuted,
      backgroundColor: "transparent",
    }),
    [
      bordered,
      theme.colors.borderMuted,
      theme.hairlineWidth,
      theme.layout.appHeaderHeight,
      verticalPadding,
    ],
  );

  const leadingGroupStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      minWidth: 0,
    }),
    [],
  );

  const titleBlockStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      minWidth: 0,
      paddingLeft: hasLeading ? 0 : 2,
    }),
    [hasLeading],
  );

  const backButtonBaseStyle = useMemo<ViewStyle>(
    () => ({
      width: actionSize,
      height: actionSize,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.bgSurfaceMuted,
      borderWidth: theme.hairlineWidth,
      borderColor: theme.colors.borderMuted,
    }),
    [
      actionSize,
      theme.colors.bgSurfaceMuted,
      theme.colors.borderMuted,
      theme.hairlineWidth,
      theme.radius.pill,
    ],
  );

  const actionWrapLeftStyle = useMemo<ViewStyle>(
    () => ({
      marginRight: theme.spacing.sm,
      justifyContent: "center",
      alignItems: "center",
    }),
    [theme.spacing.sm],
  );

  const actionWrapRightStyle = useMemo<ViewStyle>(
    () => ({
      marginLeft: theme.spacing.xs,
      alignItems: "flex-end",
      justifyContent: "center",
    }),
    [theme.spacing.xs],
  );

  return (
    <View testID={testID} style={[containerStyle, style]}>
      <View style={leadingGroupStyle}>
        {leftAction ? (
          <View style={actionWrapLeftStyle}>{leftAction}</View>
        ) : onBackPress ? (
          <View style={actionWrapLeftStyle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={onBackPress}
              style={({ pressed }) => [
                backButtonBaseStyle,
                pressed
                  ? {
                      backgroundColor: theme.colors.surfacePressed,
                      borderColor: theme.colors.borderStrong,
                    }
                  : null,
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={iconSize}
                color={theme.colors.textPrimary}
              />
            </Pressable>
          </View>
        ) : null}

        <View style={titleBlockStyle}>
          <AppText variant={compact ? "title" : "h3"} numberOfLines={1}>
            {title}
          </AppText>

          {subtitle ? (
            <AppText
              variant="bodySm"
              tone="secondary"
              numberOfLines={compact ? 1 : 2}
              style={{ marginTop: theme.spacing.xxs }}
            >
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>

      {rightAction ? (
        <View style={actionWrapRightStyle}>{rightAction}</View>
      ) : null}
    </View>
  );
}
