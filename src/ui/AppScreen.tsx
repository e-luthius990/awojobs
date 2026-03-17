import React, { useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { useTheme } from "../theme/useTheme";

export type AppScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  keyboardVerticalOffset?: number;
  edges?: Edge[];
  withTopInset?: boolean;
  withBottomInset?: boolean;
  padded?: boolean;
  centerContent?: boolean;
  backgroundColor?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement<typeof RefreshControl>;
  testID?: string;
  extraBottomSpace?: number;
};

export function AppScreen({
  children,
  scroll = false,
  keyboardAvoiding = true,
  keyboardVerticalOffset = 0,
  edges,
  withTopInset = true,
  withBottomInset = true,
  padded = true,
  centerContent = false,
  backgroundColor,
  contentContainerStyle,
  style,
  refreshControl,
  testID,
  extraBottomSpace,
}: AppScreenProps) {
  const { theme } = useTheme();

  const resolvedEdges = useMemo<Edge[]>(() => {
    if (edges) return edges;

    return [
      ...(withTopInset ? (["top"] as Edge[]) : []),
      ...(withBottomInset ? (["bottom"] as Edge[]) : []),
      "left",
      "right",
    ];
  }, [edges, withTopInset, withBottomInset]);

  const bottomSpace = useMemo(() => {
    return extraBottomSpace ?? (scroll ? theme.spacing.xxl : 0);
  }, [extraBottomSpace, scroll, theme.spacing.xxl]);

  const baseContentStyle = useMemo<ViewStyle>(
    () => ({
      flexGrow: 1,
      width: "100%",
      maxWidth: theme.layout.screenMaxWidth,
      alignSelf: "center",
      paddingHorizontal: padded ? theme.spacing.screenX : 0,
      paddingTop: padded ? theme.spacing.screenY : 0,
      paddingBottom: padded ? theme.spacing.screenY + bottomSpace : bottomSpace,
      justifyContent: centerContent ? "center" : "flex-start",
    }),
    [
      bottomSpace,
      centerContent,
      padded,
      theme.layout.screenMaxWidth,
      theme.spacing.screenX,
      theme.spacing.screenY,
    ],
  );

  const nonScrollContainerStyle = useMemo<ViewStyle>(
    () => ({
      ...baseContentStyle,
      flex: 1,
    }),
    [baseContentStyle],
  );

  const keyboardContainerStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
    }),
    [],
  );

  const screenStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      backgroundColor: backgroundColor ?? theme.colors.bgApp,
    }),
    [backgroundColor, theme.colors.bgApp],
  );

  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      contentContainerStyle={[baseContentStyle, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[nonScrollContainerStyle, contentContainerStyle]}>
      {children}
    </View>
  );

  const content = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={keyboardContainerStyle}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  return (
    <SafeAreaView
      testID={testID}
      edges={resolvedEdges}
      style={[screenStyle, style]}
    >
      {content}
    </SafeAreaView>
  );
}
