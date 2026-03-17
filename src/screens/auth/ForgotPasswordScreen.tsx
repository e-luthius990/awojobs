import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Pressable,
  Image,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { requestPasswordReset } from "../../auth/auth.service";
import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppText } from "../../ui/AppText";
import { AppInput } from "../../ui/AppInput";
import { AppButton } from "../../ui/AppButton";
import { InlineAlert } from "../../ui/InlineAlert";
import { AppEntrance } from "../../ui/AppEntrance";

function validateUgandaPhone(value: string): string | null {
  const cleaned = value.replace(/\D/g, "");

  if (!cleaned) return "Phone number is required.";

  const isValidUgNumber =
    (cleaned.startsWith("256") && cleaned.length === 12) ||
    (cleaned.startsWith("0") && cleaned.length === 10) ||
    (cleaned.startsWith("7") && cleaned.length === 9);

  if (!isValidUgNumber) {
    return "Enter a valid Uganda phone number.";
  }

  return null;
}

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  const isMountedRef = useRef(true);

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const phoneError = useMemo(() => {
    if (!phoneTouched) return null;
    return validateUgandaPhone(phone);
  }, [phone, phoneTouched]);

  const canSubmit = useMemo(() => {
    return !validateUgandaPhone(phone) && !loading;
  }, [phone, loading]);

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

  const fieldGroupStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const buttonWrapStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: theme.spacing.md,
    }),
    [theme.spacing.md],
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

  const handlePhoneChange = useCallback((value: string) => {
    setPhone(value);
    setMessage(null);
  }, []);

  const handleReset = useCallback(async () => {
    const nextPhoneError = validateUgandaPhone(phone);

    setPhoneTouched(true);
    setMessage(null);

    if (nextPhoneError || loading) {
      return;
    }

    Keyboard.dismiss();

    if (isMountedRef.current) {
      setLoading(true);
    }

    try {
      await requestPasswordReset({ phone: phone.trim() });

      if (!isMountedRef.current) return;

      setMessage("If your account exists, a reset code was sent.");
      setMessageTone("info");

      navigation.navigate("ResetCode", {
        phone: phone.trim(),
      });
    } catch (err) {
      if (!isMountedRef.current) return;

      setMessage(
        err instanceof Error
          ? err.message
          : "Unable to process request. Please try again.",
      );
      setMessageTone("error");
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [phone, loading, navigation]);

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
                    Reset your password
                  </AppText>
                </View>
              </View>
            </View>
          </AppEntrance>

          <AppEntrance delay={40}>
            <View style={bodyWrapStyle}>
              <View style={formShellStyle}>
                <View style={formTopStyle}>
                  <AppText variant="titleLg">Reset details</AppText>
                  <AppText
                    variant="bodySm"
                    tone="secondary"
                    style={formTopHintStyle}
                  >
                    Enter your phone number to receive a reset code.
                  </AppText>
                </View>

                <View style={fieldGroupStyle}>
                  <AppInput
                    label="Phone number"
                    placeholder="+256 7XX XXX XXX"
                    keyboardType="phone-pad"
                    autoCorrect={false}
                    autoCapitalize="none"
                    textContentType="telephoneNumber"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    onBlur={() => setPhoneTouched(true)}
                    returnKeyType="done"
                    onSubmitEditing={handleReset}
                    leftSlot={
                      <Ionicons
                        name="call-outline"
                        size={18}
                        color={theme.colors.textSecondary}
                      />
                    }
                    error={phoneError ?? undefined}
                  />
                </View>

                <View style={fieldGroupStyle}>
                  {message ? (
                    <InlineAlert tone={messageTone} message={message} />
                  ) : (
                    <InlineAlert
                      tone="info"
                      message="We will send a verification code before you can create a new password."
                    />
                  )}
                </View>

                <View style={buttonWrapStyle}>
                  <AppButton
                    title="Send Code"
                    onPress={handleReset}
                    loading={loading}
                    disabled={!canSubmit}
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
                  Remembered your password?{" "}
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
