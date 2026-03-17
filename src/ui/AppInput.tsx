import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../theme/useTheme";
import { AppText } from "./AppText";

export type AppInputProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
};

export const AppInput = forwardRef<TextInput, AppInputProps>(function AppInput(
  {
    label,
    hint,
    error,
    optional = false,
    containerStyle,
    inputContainerStyle,
    leftSlot,
    rightSlot,
    multiline = false,
    editable = true,
    onFocus,
    onBlur,
    style,
    accessibilityLabel,
    placeholder,
    ...rest
  },
  ref,
) {
  const { theme } = useTheme();
  const innerRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  useImperativeHandle(ref, () => innerRef.current as TextInput, []);

  const hasError = Boolean(error);
  const helperText = error ?? hint;
  const isInteractive = editable;

  const helperTone: React.ComponentProps<typeof AppText>["tone"] = hasError
    ? "error"
    : "secondary";

  const minContainerHeight = multiline ? 120 : theme.layout.inputHeight;
  const minTextInputHeight = multiline ? 96 : undefined;

  const resolvedAccessibilityLabel =
    accessibilityLabel ?? label ?? placeholder ?? "Input field";

  const fieldStateStyle = useMemo<ViewStyle>(() => {
    if (!editable) {
      return {
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.bgSurfaceMuted,
        opacity: 0.82,
        shadowOpacity: 0,
        elevation: 0,
      };
    }

    if (hasError) {
      return {
        borderColor: theme.colors.inputBorderError,
        backgroundColor: theme.colors.inputBg,
        shadowOpacity: 0,
        elevation: 0,
      };
    }

    if (focused) {
      return {
        borderColor: theme.colors.inputBorderFocused,
        backgroundColor: theme.colors.inputBg,
      };
    }

    return {
      borderColor: theme.colors.inputBorder,
      backgroundColor: theme.colors.inputBg,
      shadowOpacity: 0,
      elevation: 0,
    };
  }, [
    editable,
    focused,
    hasError,
    theme.colors.bgSurfaceMuted,
    theme.colors.borderMuted,
    theme.colors.inputBg,
    theme.colors.inputBorder,
    theme.colors.inputBorderError,
    theme.colors.inputBorderFocused,
  ]);

  const wrapperStyle = useMemo<ViewStyle>(
    () => ({
      minHeight: minContainerHeight,
      flexDirection: "row",
      alignItems: multiline ? "flex-start" : "center",
    }),
    [minContainerHeight, multiline],
  );

  const textInputStyle = useMemo<TextStyle>(
    () => ({
      flex: 1,
      color: editable ? theme.colors.inputText : theme.colors.textSecondary,
      ...theme.typography.body,
      textAlignVertical: multiline ? "top" : "center",
      paddingVertical: multiline ? theme.spacing.xs : 0,
      minHeight: minTextInputHeight,
    }),
    [
      editable,
      multiline,
      minTextInputHeight,
      theme.colors.inputText,
      theme.colors.textSecondary,
      theme.spacing.xs,
      theme.typography.body,
    ],
  );

  const leftSlotStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: multiline ? 2 : 0,
      marginRight: theme.spacing.sm,
      justifyContent: "center",
    }),
    [multiline, theme.spacing.sm],
  );

  const rightSlotStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: multiline ? 2 : 0,
      marginLeft: theme.spacing.sm,
      justifyContent: "center",
    }),
    [multiline, theme.spacing.sm],
  );

  const labelRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
    }),
    [],
  );

  return (
    <View style={[theme.input.container, containerStyle]}>
      {label ? (
        <View style={labelRowStyle}>
          <AppText variant="labelLg" tone="primary">
            {label}
          </AppText>

          {optional ? (
            <View style={{ marginLeft: theme.spacing.xs }}>
              <AppText variant="caption" tone="tertiary">
                Optional
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}

      <Pressable
        accessible={false}
        disabled={!isInteractive}
        onPress={() => {
          innerRef.current?.focus();
        }}
        style={[
          theme.input.field,
          fieldStateStyle,
          wrapperStyle,
          focused && !hasError && editable ? theme.shadows.focusRing : null,
          inputContainerStyle,
        ]}
      >
        {leftSlot ? <View style={leftSlotStyle}>{leftSlot}</View> : null}

        <TextInput
          ref={innerRef}
          editable={editable}
          multiline={multiline}
          placeholderTextColor={theme.colors.inputPlaceholder}
          selectionColor={theme.colors.inputBorderFocused}
          accessibilityLabel={resolvedAccessibilityLabel}
          accessibilityHint={helperText || undefined}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[textInputStyle, style]}
          {...rest}
        />

        {rightSlot ? <View style={rightSlotStyle}>{rightSlot}</View> : null}
      </Pressable>

      {helperText ? (
        <View accessibilityLiveRegion={hasError ? "polite" : undefined}>
          <AppText variant="caption" tone={helperTone}>
            {helperText}
          </AppText>
        </View>
      ) : null}
    </View>
  );
});
