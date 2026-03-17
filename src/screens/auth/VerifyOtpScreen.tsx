import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
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
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  verifyRegistrationOtp,
  resendRegistrationOtp,
} from "../../auth/auth.service";
import { consumePendingIntent } from "../../intent/intent.store";

import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppText } from "../../ui/AppText";
import { AppButton } from "../../ui/AppButton";
import { InlineAlert } from "../../ui/InlineAlert";
import { AppEntrance } from "../../ui/AppEntrance";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyOtpScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  const phone = route.params?.phone as string | undefined;
  const password = route.params?.password as string | undefined;
  const intent = route.params?.intent as
    | "premium_upgrade"
    | "post_job"
    | undefined;

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const isMountedRef = useRef(true);

  const maskedPhone = useMemo(() => {
    if (!phone) return "";
    return phone.replace(/^(\+256\d{2})\d{4}(\d{2})$/, "$1****$2");
  }, [phone]);

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

  const completeRegistrationSession = Boolean(phone && password);

  const rootStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
    }),
    [],
  );

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

  const brandTextWrapStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
    }),
    [],
  );

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

  const formTopHintStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: 6,
    }),
    [],
  );

  const otpWrapStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const otpContainerStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm,
    }),
    [theme.spacing.sm],
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

  const footerActionsStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const resendWrapStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
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

  const handleVerify = useCallback(async () => {
    if (loading) return;

    if (!phone || !password) {
      setError("Registration session is incomplete. Please start again.");
      return;
    }

    if (otp.length !== OTP_LENGTH) {
      setError("Enter the 6-digit code.");
      triggerShake();
      return;
    }

    Keyboard.dismiss();
    setError(null);

    if (isMountedRef.current) {
      setLoading(true);
    }

    try {
      await verifyRegistrationOtp({
        phone,
        otp,
        password,
      });

      if (!isMountedRef.current) return;

      const pending = consumePendingIntent();

      const shouldResumePremium =
        intent === "premium_upgrade" ||
        (pending?.intent === "premium" && pending?.returnTo === "Premium");

      const shouldResumePostJob =
        intent === "post_job" ||
        (pending?.intent === "post_job" && pending?.returnTo === "PostJob");

      if (shouldResumePremium) {
        navigation.reset({
          index: 1,
          routes: [{ name: "App" }, { name: "Premium" }],
        });
        return;
      }

      if (shouldResumePostJob) {
        navigation.reset({
          index: 0,
          routes: [{ name: "App" }],
        });
        return;
      }

      navigation.reset({
        index: 0,
        routes: [{ name: "App" }],
      });
    } catch (err) {
      if (!isMountedRef.current) return;

      setOtp("");
      triggerShake();
      setError(err instanceof Error ? err.message : "Invalid or expired code.");
      inputRef.current?.focus();
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [otp, phone, password, loading, navigation, intent, triggerShake]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || loading || resending || !phone) return;

    try {
      if (isMountedRef.current) {
        setResending(true);
        setError(null);
      }

      await resendRegistrationOtp({
        phone,
      });

      if (!isMountedRef.current) return;

      setCooldown(RESEND_SECONDS);
      setOtp("");
      inputRef.current?.focus();
    } catch (err) {
      if (!isMountedRef.current) return;

      setError(err instanceof Error ? err.message : "Unable to resend code.");
    } finally {
      if (isMountedRef.current) {
        setResending(false);
      }
    }
  }, [cooldown, phone, loading, resending]);

  const handleOtpChange = useCallback(
    (text: string) => {
      if (!/^\d*$/.test(text) || text.length > OTP_LENGTH) return;

      setOtp(text);
      if (error) setError(null);
    },
    [error],
  );

  useEffect(() => {
    if (otp.length === OTP_LENGTH && !loading && completeRegistrationSession) {
      void handleVerify();
    }
  }, [otp, loading, completeRegistrationSession, handleVerify]);

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
                    Verification
                  </AppText>
                </View>
              </View>
            </View>
          </AppEntrance>

          <AppEntrance delay={40}>
            <View style={bodyWrapStyle}>
              <View style={formShellStyle}>
                <View style={formTopStyle}>
                  <AppText variant="titleLg">Verification code</AppText>
                  <AppText
                    variant="bodySm"
                    tone="secondary"
                    style={formTopHintStyle}
                  >
                    Enter the 6-digit code sent to {maskedPhone || "your phone"}
                    .
                  </AppText>
                </View>

                <View style={otpWrapStyle}>
                  <Animated.View
                    style={[
                      otpContainerStyle,
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
                            otpBoxStyle,
                            !isLast ? otpBoxSpacerStyle : null,
                            isActive && stylesFalsyFix(otpBoxActiveStyle),
                            isFilled && stylesFalsyFix(otpBoxFilledStyle),
                            error ? otpBoxErrorStyle : null,
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
                      style={hiddenInputStyle}
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

                <View style={footerActionsStyle}>
                  <AppButton
                    title="Continue"
                    onPress={handleVerify}
                    loading={loading}
                    disabled={
                      loading ||
                      !completeRegistrationSession ||
                      otp.length !== OTP_LENGTH
                    }
                    variant="primary"
                  />

                  <Pressable
                    onPress={handleResend}
                    disabled={cooldown > 0 || loading || resending}
                    style={({ pressed }) => [
                      resendWrapStyle,
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

function stylesFalsyFix<T>(style: T): T {
  return style;
}
