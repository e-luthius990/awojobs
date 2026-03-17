import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, TextInput, View } from "react-native";

import { useTheme } from "../../../theme/useTheme";
import { AppText } from "../../ui/AppText";

interface PremiumOtpInputProps {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  shake?: boolean;
}

export default function PremiumOtpInput({
  length = 6,
  value,
  onChange,
  shake = false,
}: PremiumOtpInputProps) {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!shake) return;

    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shake, shakeAnim]);

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, length);
    onChange(digits);
  };

  const digits = value.padEnd(length, " ").split("");

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: "row",
          justifyContent: "space-between",
          width: "100%",
          gap: theme.spacing.xs,
        },

        box: {
          flex: 1,
          maxWidth: 52,
          height: 60,
          borderWidth: 1,
          borderRadius: theme.radius.lg,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.inputBg,
          borderColor: theme.colors.inputBorder,
        },

        boxFilled: {
          borderColor: theme.colors.borderStrong,
        },

        boxActive: {
          borderColor: theme.colors.inputBorderFocused,
          backgroundColor: theme.colors.bgSurfaceElevated,
        },

        boxError: {
          borderColor: theme.colors.inputBorderError,
        },

        hiddenInput: {
          position: "absolute",
          opacity: 0,
          width: "100%",
          height: "100%",
        },
      }),
    [theme],
  );

  return (
    <Animated.View
      style={[
        styles.container,
        shake ? { transform: [{ translateX: shakeAnim }] } : null,
      ]}
    >
      {digits.map((digit, index) => {
        const isFilled = digit !== " ";
        const isActive = index === value.length && value.length < length;

        return (
          <Pressable
            key={index}
            onPress={() => inputRef.current?.focus()}
            style={[
              styles.box,
              isFilled ? styles.boxFilled : null,
              isActive ? styles.boxActive : null,
              shake ? styles.boxError : null,
            ]}
          >
            <AppText variant="h3" weight="700">
              {isFilled ? digit : ""}
            </AppText>
          </Pressable>
        );
      })}

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        style={styles.hiddenInput}
        autoFocus
      />
    </Animated.View>
  );
}
