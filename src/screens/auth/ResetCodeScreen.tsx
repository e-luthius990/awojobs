import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
} from "react";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  Image,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

import { confirmPasswordReset } from "../../auth/auth.service";
import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppText } from "../../ui/AppText";
import { AppInput } from "../../ui/AppInput";
import { AppButton } from "../../ui/AppButton";
import { InlineAlert } from "../../ui/InlineAlert";
import { AppEntrance } from "../../ui/AppEntrance";

const OTP_LENGTH = 6;

function validatePassword(value: string): string | null {
  if (!value) return "Password is required.";
  if (value.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value)) {
    return "Password must include letters and numbers.";
  }
  return null;
}

function validateConfirmPassword(
  password: string,
  confirmPassword: string,
): string | null {
  if (!confirmPassword) return "Please confirm your password.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return null;
}

export default function ResetCodeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();

  const phone = route.params?.phone as string | undefined;

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput | null>(null);
  const confirmPasswordRef = useRef<TextInput | null>(null);
  const isMountedRef = useRef(true);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, []);

  const passwordError = useMemo(() => {
    if (!passwordTouched) return null;
    return validatePassword(password);
  }, [password, passwordTouched]);

  const confirmPasswordError = useMemo(() => {
    if (!confirmPasswordTouched) return null;
    return validateConfirmPassword(password, confirmPassword);
  }, [password, confirmPassword, confirmPasswordTouched]);

  const isValid = useMemo(() => {
    return (
      code.length === OTP_LENGTH &&
      !validatePassword(password) &&
      !validateConfirmPassword(password, confirmPassword)
    );
  }, [code, password, confirmPassword]);

  const maskedPhone = useMemo(() => {
    if (!phone) return "";
    return phone.replace(/^(\+256\d{2})\d{4}(\d{2})$/, "$1****$2");
  }, [phone]);

  const rootStyle = useMemo<ViewStyle>(() => ({ flex: 1 }), []);

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      flexGrow: 1,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.screenX,
    }),
    [theme.spacing.lg, theme.spacing.md, theme.spacing.screenX],
  );

  const brandSectionStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.xl,
    }),
    [theme.spacing.xl],
  );

  const brandRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      paddingTop: theme.spacing.xs,
      paddingHorizontal: 2,
    }),
    [theme.spacing.xs],
  );

  const navMarkStyle = useMemo<ViewStyle>(
    () => ({
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: theme.colors.bgSurface,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing.md,
      ...theme.shadows.level1,
    }),
    [
      theme.colors.bgSurface,
      theme.colors.borderDefault,
      theme.shadows.level1,
      theme.spacing.md,
    ],
  );

  const brandMarkStyle = useMemo<ViewStyle>(
    () => ({
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: theme.colors.bgSurface,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing.md,
      ...theme.shadows.level1,
    }),
    [
      theme.colors.bgSurface,
      theme.colors.borderDefault,
      theme.shadows.level1,
      theme.spacing.md,
    ],
  );

  const brandLogoStyle = useMemo<ViewStyle>(
    () => ({
      width: 72,
      height: 72,
    }),
    [],
  );

  const brandTextWrapStyle = useMemo<ViewStyle>(() => ({ flex: 1 }), []);

  const brandSubtitleStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: theme.spacing.xxs,
    }),
    [theme.spacing.xxs],
  );

  const bodyWrapStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      justifyContent: "center",
      paddingTop: theme.spacing.lg,
    }),
    [theme.spacing.lg],
  );

  const formShellStyle = useMemo<ViewStyle>(
    () => ({
      borderRadius: 28,
      backgroundColor: theme.colors.bgSurfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      padding: theme.spacing.lg,
      ...theme.shadows.level2,
    }),
    [
      theme.colors.bgSurfaceElevated,
      theme.colors.borderDefault,
      theme.shadows.level2,
      theme.spacing.lg,
    ],
  );

  const formTopStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const formTopHintStyle = useMemo<ViewStyle>(() => ({ marginTop: 6 }), []);

  const otpWrapStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const otpTitleStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const otpContainerStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      justifyContent: "space-between",
    }),
    [],
  );

  const otpBoxStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      maxWidth: 52,
      height: 60,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.inputBg,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      alignItems: "center",
      justifyContent: "center",
    }),
    [theme.colors.inputBg, theme.colors.inputBorder, theme.radius.lg],
  );

  const otpBoxSpacerStyle = useMemo<ViewStyle>(
    () => ({
      marginRight: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const otpBoxActiveStyle = useMemo<ViewStyle>(
    () => ({
      borderColor: theme.colors.inputBorderFocused,
      backgroundColor: theme.colors.bgSurfaceElevated,
    }),
    [theme.colors.bgSurfaceElevated, theme.colors.inputBorderFocused],
  );

  const otpBoxFilledStyle = useMemo<ViewStyle>(
    () => ({
      borderColor: theme.colors.borderStrong,
    }),
    [theme.colors.borderStrong],
  );

  const otpBoxErrorStyle = useMemo<ViewStyle>(
    () => ({
      borderColor: theme.colors.inputBorderError,
    }),
    [theme.colors.inputBorderError],
  );

  const hiddenInputStyle = useMemo<ViewStyle>(
    () => ({
      position: "absolute",
      opacity: 0,
      width: 1,
      height: 1,
    }),
    [],
  );

  const fieldGroupStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const buttonWrapStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const footerStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      paddingTop: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const helperRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      flexWrap: "wrap",
    }),
    [],
  );

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 12,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -12,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnim]);

  const handleConfirm = useCallback(async () => {
    const nextPasswordError = validatePassword(password);
    const nextConfirmPasswordError = validateConfirmPassword(
      password,
      confirmPassword,
    );

    setPasswordTouched(true);
    setConfirmPasswordTouched(true);

    if (!phone) {
      setSubmitError("Reset session is incomplete. Please start again.");
      return;
    }

    if (code.length !== OTP_LENGTH) {
      setSubmitError("Enter the 6-digit code.");
      triggerShake();
      return;
    }

    if (nextPasswordError || nextConfirmPasswordError || loading) {
      return;
    }

    Keyboard.dismiss();
    setSubmitError(null);
    setSuccess(false);

    if (isMountedRef.current) {
      setLoading(true);
    }

    try {
      const result = await confirmPasswordReset({
        phone,
        token: code,
        newPassword: password,
      });

      if (!isMountedRef.current) return;

      if (!result.ok) {
        triggerShake();
        setSubmitError(result.error.message);
        return;
      }

      setSuccess(true);

      redirectTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        navigation.popToTop();
      }, 1200);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    code,
    password,
    confirmPassword,
    phone,
    loading,
    navigation,
    triggerShake,
  ]);

  const handleBackToLogin = useCallback(() => {
    navigation.popToTop();
  }, [navigation]);

  return (
    <AppScreen scroll={false} keyboardAvoiding={false} padded={false}>
      <KeyboardAvoidingView
        style={rootStyle}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <AppEntrance>
            <View style={brandSectionStyle}>
              <View style={brandRowStyle}>
                <Pressable
                  onPress={() => navigation.goBack()}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  style={({ pressed }) => [
                    navMarkStyle,
                    pressed ? { opacity: 0.8 } : null,
                  ]}
                >
                  <Ionicons
                    name="chevron-back"
                    size={22}
                    color={theme.colors.textPrimary}
                  />
                </Pressable>

                <View style={brandMarkStyle}>
                  <Image
                    source={require("../../../assets/logo.png")}
                    style={brandLogoStyle}
                    resizeMode="contain"
                  />
                </View>

                <View style={brandTextWrapStyle}>
                  <AppText variant="labelLg" weight="700">
                    AwoJobs
                  </AppText>
                  <AppText
                    variant="caption"
                    tone="secondary"
                    style={brandSubtitleStyle}
                  >
                    Confirm reset
                  </AppText>
                </View>
              </View>
            </View>
          </AppEntrance>

          <AppEntrance delay={40}>
            <View style={bodyWrapStyle}>
              <View style={formShellStyle}>
                <View style={formTopStyle}>
                  <AppText variant="titleLg">Verification</AppText>
                  <AppText
                    variant="bodySm"
                    tone="secondary"
                    style={formTopHintStyle}
                  >
                    Enter the 6-digit code sent to {maskedPhone || "your phone"}{" "}
                    and create a new password.
                  </AppText>
                </View>

                <View style={otpWrapStyle}>
                  <AppText variant="labelLg" style={otpTitleStyle}>
                    Reset code
                  </AppText>

                  <Animated.View
                    style={[
                      otpContainerStyle,
                      { transform: [{ translateX: shakeAnim }] },
                    ]}
                  >
                    {Array.from({ length: OTP_LENGTH }).map((_, index) => {
                      const isActive = index === code.length;
                      const isFilled = Boolean(code[index]);
                      const isLast = index === OTP_LENGTH - 1;

                      return (
                        <Pressable
                          key={index}
                          onPress={() => inputRef.current?.focus()}
                          style={[
                            otpBoxStyle,
                            !isLast ? otpBoxSpacerStyle : null,
                            isActive ? otpBoxActiveStyle : null,
                            isFilled ? otpBoxFilledStyle : null,
                            submitError ? otpBoxErrorStyle : null,
                          ]}
                        >
                          <AppText
                            variant="h3"
                            style={{ color: theme.colors.textPrimary }}
                          >
                            {code[index] ?? ""}
                          </AppText>
                        </Pressable>
                      );
                    })}

                    <TextInput
                      ref={inputRef}
                      value={code}
                      onChangeText={(text) => {
                        if (/^\d*$/.test(text) && text.length <= OTP_LENGTH) {
                          setCode(text);
                          if (submitError) setSubmitError(null);
                        }
                      }}
                      keyboardType="number-pad"
                      textContentType="oneTimeCode"
                      autoComplete="sms-otp"
                      maxLength={OTP_LENGTH}
                      style={hiddenInputStyle}
                    />
                  </Animated.View>
                </View>

                <View style={fieldGroupStyle}>
                  <InlineAlert
                    tone="info"
                    message="Enter the full 6-digit code exactly as received."
                  />
                </View>

                <View style={fieldGroupStyle}>
                  <AppInput
                    ref={passwordRef}
                    label="New password"
                    placeholder="Create a new password"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      if (submitError) setSubmitError(null);
                    }}
                    onBlur={() => setPasswordTouched(true)}
                    autoCorrect={false}
                    autoCapitalize="none"
                    textContentType="newPassword"
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    leftSlot={
                      <Ionicons
                        name="lock-closed-outline"
                        size={18}
                        color={theme.colors.textSecondary}
                      />
                    }
                    rightSlot={
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onPress={() => setShowPassword((p) => !p)}
                        hitSlop={8}
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-off-outline" : "eye-outline"
                          }
                          size={20}
                          color={theme.colors.textSecondary}
                        />
                      </Pressable>
                    }
                    hint="Use at least 8 characters with letters and numbers."
                    error={passwordError ?? undefined}
                  />
                </View>

                <View style={fieldGroupStyle}>
                  <AppInput
                    ref={confirmPasswordRef}
                    label="Confirm password"
                    placeholder="Re-enter your new password"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={(value) => {
                      setConfirmPassword(value);
                      if (submitError) setSubmitError(null);
                    }}
                    onBlur={() => setConfirmPasswordTouched(true)}
                    autoCorrect={false}
                    autoCapitalize="none"
                    textContentType="password"
                    returnKeyType="done"
                    onSubmitEditing={handleConfirm}
                    leftSlot={
                      <Ionicons
                        name="lock-closed-outline"
                        size={18}
                        color={theme.colors.textSecondary}
                      />
                    }
                    rightSlot={
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                        onPress={() => setShowConfirmPassword((p) => !p)}
                        hitSlop={8}
                      >
                        <Ionicons
                          name={
                            showConfirmPassword
                              ? "eye-off-outline"
                              : "eye-outline"
                          }
                          size={20}
                          color={theme.colors.textSecondary}
                        />
                      </Pressable>
                    }
                    error={confirmPasswordError ?? undefined}
                  />
                </View>

                {submitError ? (
                  <View style={fieldGroupStyle}>
                    <InlineAlert tone="error" message={submitError} />
                  </View>
                ) : null}

                {success ? (
                  <View style={fieldGroupStyle}>
                    <InlineAlert
                      tone="success"
                      message="Password reset successful. Redirecting to sign in."
                    />
                  </View>
                ) : null}

                <View style={buttonWrapStyle}>
                  <AppButton
                    title="Confirm Reset"
                    onPress={handleConfirm}
                    loading={loading}
                    disabled={!isValid || loading}
                    variant="primary"
                  />
                </View>
              </View>
            </View>
          </AppEntrance>

          <View style={footerStyle}>
            <Pressable
              onPress={handleBackToLogin}
              style={({ pressed }) => [pressed ? { opacity: 0.72 } : null]}
            >
              <View style={helperRowStyle}>
                <AppText variant="bodySm" tone="secondary">
                  Back to{" "}
                </AppText>
                <AppText variant="bodySm" tone="link" weight="700">
                  Sign In
                </AppText>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
