import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  TextInput,
  Pressable,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useRoute,
  useNavigation,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  verifyRegistrationOtp,
  resendRegistrationOtp,
} from "../../auth/auth.service";
import {
  peekPendingIntent,
  clearPendingIntent,
} from "../../intent/intent.store";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppText } from "../../ui/AppText";
import { AppButton } from "../../ui/AppButton";
import { InlineAlert } from "../../ui/InlineAlert";
import { AppEntrance } from "../../ui/AppEntrance";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import type { RootStackParamList } from "../../navigation/RootNavigator";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

type VerifyOtpScreenRouteProp = RouteProp<AuthStackParamList, "VerifyOtp">;
type VerifyOtpScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  "VerifyOtp"
>;
type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

function normalizeUgandaPhone(value: string): string {
  const cleaned = value.replace(/\D/g, "");

  if (cleaned.startsWith("256") && cleaned.length === 12) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return `+256${cleaned.slice(1)}`;
  }

  if (cleaned.startsWith("7") && cleaned.length === 9) {
    return `+256${cleaned}`;
  }

  throw new Error("Enter a valid Uganda phone number.");
}

function maskUgandaPhone(phone: string): string {
  const normalized = normalizeUgandaPhone(phone);
  const cleaned = normalized.replace(/\D/g, "");

  return `+${cleaned.slice(0, 5)}****${cleaned.slice(-2)}`;
}

export default function VerifyOtpScreen() {
  const route = useRoute<VerifyOtpScreenRouteProp>();
  const navigation = useNavigation<VerifyOtpScreenNavigationProp>();
  const rootNavigation = useNavigation<RootNavigationProp>();
  const { theme } = useTheme();

  const { phone, password, intent, role } = route.params;

  const canonicalPhone = useMemo(() => normalizeUgandaPhone(phone), [phone]);
  const maskedPhone = useMemo(() => maskUgandaPhone(phone), [phone]);

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const isMountedRef = useRef(true);
  const verifyInFlightRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;

    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldown]);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
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

  const resetToApp = useCallback(() => {
    rootNavigation.reset({
      index: 0,
      routes: [{ name: "App" }],
    });
  }, [rootNavigation]);

  const resetToPremium = useCallback(() => {
    rootNavigation.reset({
      index: 1,
      routes: [{ name: "App" }, { name: "Premium" }],
    });
  }, [rootNavigation]);

  const handleVerify = useCallback(async () => {
    if (verifyInFlightRef.current || loading) return;

    if (otp.length !== OTP_LENGTH) {
      setError("Enter the 6-digit code.");
      triggerShake();
      return;
    }

    Keyboard.dismiss();
    setError(null);
    verifyInFlightRef.current = true;

    if (isMountedRef.current) {
      setLoading(true);
    }

    try {
      const result = await verifyRegistrationOtp({
        phone: canonicalPhone,
        otp,
        password,
      });

      if (!isMountedRef.current) return;

      if (!result.ok) {
        setOtp("");
        triggerShake();
        setError(result.error.message);
        inputRef.current?.focus();
        return;
      }

      const pending = await peekPendingIntent();

      const shouldResumePremium =
        intent === "premium_upgrade" ||
        (role === "job_seeker" && pending?.kind === "premium_upgrade");

      const shouldResumePostJob =
        intent === "post_job" ||
        (role === "employer" && pending?.kind === "post_job");

      await clearPendingIntent();

      if (shouldResumePremium) {
        resetToPremium();
        return;
      }

      if (shouldResumePostJob) {
        resetToApp();
        return;
      }

      resetToApp();
    } finally {
      verifyInFlightRef.current = false;

      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    canonicalPhone,
    intent,
    loading,
    otp,
    password,
    resetToApp,
    resetToPremium,
    role,
    triggerShake,
  ]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || loading || resending) return;

    if (isMountedRef.current) {
      setResending(true);
      setError(null);
    }

    try {
      const result = await resendRegistrationOtp({ phone: canonicalPhone });

      if (!isMountedRef.current) return;

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setCooldown(RESEND_SECONDS);
      setOtp("");
      inputRef.current?.focus();
    } finally {
      if (isMountedRef.current) {
        setResending(false);
      }
    }
  }, [canonicalPhone, cooldown, loading, resending]);

  const handleOtpChange = useCallback(
    (text: string) => {
      if (!/^\d*$/.test(text) || text.length > OTP_LENGTH) return;
      setOtp(text);
      if (error) setError(null);
    },
    [error],
  );

  useEffect(() => {
    if (otp.length === OTP_LENGTH && !loading && !verifyInFlightRef.current) {
      void handleVerify();
    }
  }, [otp, loading, handleVerify]);

  const handleBackToLogin = useCallback(() => {
    navigation.popToTop();
  }, [navigation]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
        },
        content: {
          flexGrow: 1,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.lg,
          paddingHorizontal: theme.spacing.screenX,
        },
        brandSection: {
          marginBottom: theme.spacing.xl,
        },
        brandRow: {
          flexDirection: "row",
          alignItems: "center",
          paddingTop: theme.spacing.xs,
          paddingHorizontal: 2,
        },
        navMark: {
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
        },
        brandMark: {
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
        },
        brandLogo: {
          width: 72,
          height: 72,
        },
        brandTextWrap: {
          flex: 1,
        },
        brandSubtitle: {
          marginTop: theme.spacing.xxs,
        },
        bodyWrap: {
          flex: 1,
          justifyContent: "center",
          paddingTop: theme.spacing.lg,
        },
        formShell: {
          borderRadius: 28,
          backgroundColor: theme.colors.bgSurfaceElevated,
          borderWidth: 1,
          borderColor: theme.colors.borderDefault,
          padding: theme.spacing.lg,
          ...theme.shadows.level2,
        },
        formTop: {
          marginBottom: theme.spacing.md,
        },
        formTopHint: {
          marginTop: 6,
        },
        otpWrap: {
          marginBottom: theme.spacing.md,
        },
        otpContainer: {
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: theme.spacing.sm,
        },
        otpBox: {
          flex: 1,
          maxWidth: 52,
          height: 60,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.inputBg,
          borderWidth: 1,
          borderColor: theme.colors.inputBorder,
          alignItems: "center",
          justifyContent: "center",
        },
        otpBoxSpacer: {
          marginRight: theme.spacing.xs,
        },
        otpBoxActive: {
          borderColor: theme.colors.inputBorderFocused,
          backgroundColor: theme.colors.bgSurfaceElevated,
        },
        otpBoxFilled: {
          borderColor: theme.colors.borderStrong,
        },
        otpBoxError: {
          borderColor: theme.colors.inputBorderError,
        },
        hiddenInput: {
          position: "absolute",
          opacity: 0,
          width: 1,
          height: 1,
        },
        footerActions: {
          marginTop: theme.spacing.md,
        },
        resendWrap: {
          alignItems: "center",
          justifyContent: "center",
          minHeight: 44,
          marginTop: theme.spacing.sm,
        },
        footer: {
          alignItems: "center",
          paddingTop: theme.spacing.sm,
        },
        helperRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
        },
      }),
    [theme],
  );

  return (
    <AppScreen scroll={false} keyboardAvoiding={false} padded={false}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <AppEntrance>
            <View style={styles.brandSection}>
              <View style={styles.brandRow}>
                <Pressable
                  onPress={() => navigation.goBack()}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  style={({ pressed }) => [
                    styles.navMark,
                    pressed ? { opacity: 0.8 } : null,
                  ]}
                >
                  <Ionicons
                    name="chevron-back"
                    size={22}
                    color={theme.colors.textPrimary}
                  />
                </Pressable>

                <View style={styles.brandMark}>
                  <Image
                    source={require("../../../assets/logo.png")}
                    style={styles.brandLogo}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.brandTextWrap}>
                  <AppText variant="labelLg" weight="700">
                    AwoJobs
                  </AppText>
                  <AppText
                    variant="caption"
                    tone="secondary"
                    style={styles.brandSubtitle}
                  >
                    Verification
                  </AppText>
                </View>
              </View>
            </View>
          </AppEntrance>

          <AppEntrance delay={40}>
            <View style={styles.bodyWrap}>
              <View style={styles.formShell}>
                <View style={styles.formTop}>
                  <AppText variant="titleLg">Verification code</AppText>
                  <AppText
                    variant="bodySm"
                    tone="secondary"
                    style={styles.formTopHint}
                  >
                    Enter the 6-digit code sent to {maskedPhone}.
                  </AppText>
                </View>

                <View style={styles.otpWrap}>
                  <Animated.View
                    style={[
                      styles.otpContainer,
                      { transform: [{ translateX: shakeAnim }] },
                    ]}
                  >
                    {Array.from({ length: OTP_LENGTH }).map((_, index) => {
                      const isActive = index === otp.length;
                      const isFilled = Boolean(otp[index]);
                      const isLast = index === OTP_LENGTH - 1;

                      return (
                        <Pressable
                          key={index}
                          onPress={() => inputRef.current?.focus()}
                          style={[
                            styles.otpBox,
                            !isLast ? styles.otpBoxSpacer : null,
                            isActive ? styles.otpBoxActive : null,
                            isFilled ? styles.otpBoxFilled : null,
                            error ? styles.otpBoxError : null,
                          ]}
                        >
                          <AppText
                            variant="h3"
                            style={{ color: theme.colors.textPrimary }}
                          >
                            {otp[index] ?? ""}
                          </AppText>
                        </Pressable>
                      );
                    })}

                    <TextInput
                      ref={inputRef}
                      value={otp}
                      onChangeText={handleOtpChange}
                      keyboardType="number-pad"
                      textContentType="oneTimeCode"
                      autoComplete="sms-otp"
                      maxLength={OTP_LENGTH}
                      style={styles.hiddenInput}
                      autoFocus
                    />
                  </Animated.View>

                  {error ? (
                    <InlineAlert tone="error" message={error} />
                  ) : (
                    <InlineAlert
                      tone="info"
                      message="Enter the 6-digit code exactly as received."
                    />
                  )}
                </View>

                <View style={styles.footerActions}>
                  <AppButton
                    title="Continue"
                    onPress={() => void handleVerify()}
                    loading={loading}
                    disabled={loading || otp.length !== OTP_LENGTH}
                    variant="primary"
                  />

                  <Pressable
                    onPress={() => void handleResend()}
                    disabled={cooldown > 0 || loading || resending}
                    style={({ pressed }) => [
                      styles.resendWrap,
                      pressed && cooldown <= 0 && !loading && !resending
                        ? { opacity: 0.72 }
                        : null,
                      cooldown > 0 || loading || resending
                        ? { opacity: 0.5 }
                        : null,
                    ]}
                  >
                    <AppText variant="labelLg" tone="link" weight="700">
                      {resending
                        ? "Resending..."
                        : cooldown > 0
                          ? `Resend in ${cooldown}s`
                          : "Resend code"}
                    </AppText>
                  </Pressable>
                </View>
              </View>
            </View>
          </AppEntrance>

          <View style={styles.footer}>
            <Pressable
              onPress={handleBackToLogin}
              style={({ pressed }) => [pressed ? { opacity: 0.72 } : null]}
            >
              <View style={styles.helperRow}>
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
