import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
  Image,
  TextInput,
  type ViewStyle,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { login } from "../../auth/auth.service";
import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppText } from "../../ui/AppText";
import { AppButton } from "../../ui/AppButton";
import { AppInput } from "../../ui/AppInput";
import { InlineAlert } from "../../ui/InlineAlert";
import { AppEntrance } from "../../ui/AppEntrance";

const FORM_TITLE = "Login";
const LOGIN_HINT = "Use the phone number and password linked to your account.";

function normalizePhonePreview(value: string) {
  return value.trim();
}

function validatePhone(value: string): string | null {
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

function validatePassword(value: string): string | null {
  if (!value) return "Password is required.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  const passwordRef = useRef<TextInput | null>(null);
  const isMountedRef = useRef(true);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);

  const [phoneTouched, setPhoneTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const phoneError = useMemo(() => {
    if (!phoneTouched) return null;
    return validatePhone(phone);
  }, [phone, phoneTouched]);

  const passwordError = useMemo(() => {
    if (!passwordTouched) return null;
    return validatePassword(password);
  }, [password, passwordTouched]);

  const canSubmit = useMemo(() => {
    return !validatePhone(phone) && !validatePassword(password) && !loading;
  }, [phone, password, loading]);

  const rootStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
    }),
    [],
  );

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      flexGrow: 1,
      justifyContent: "center",
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.screenX,
    }),
    [theme.spacing.lg, theme.spacing.screenX],
  );

  const topSectionStyle = useMemo<ViewStyle>(
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
      theme.radius,
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
      marginBottom: theme.spacing.lg,
    }),
    [theme.spacing.lg],
  );

  const formTopHintStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: 6,
    }),
    [],
  );

  const fieldGroupStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const forgotWrapStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "flex-end",
      marginTop: -2,
      marginBottom: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const forgotPressableStyle = useMemo<ViewStyle>(
    () => ({
      minHeight: 36,
      justifyContent: "center",
    }),
    [],
  );

  const buttonWrapStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const footerStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      paddingTop: theme.spacing.lg,
    }),
    [theme.spacing.lg],
  );

  const footerPrimaryLinkStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const signupRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      flexWrap: "wrap",
    }),
    [],
  );

  const legalWrapStyle = useMemo<ViewStyle>(
    () => ({
      paddingHorizontal: theme.spacing.lg,
    }),
    [theme.spacing.lg],
  );

  const toggleSecure = useCallback(() => {
    setSecure((prev) => !prev);
  }, []);

  const handlePhoneChange = useCallback((value: string) => {
    setPhone(value);
    setSubmitError(null);
  }, []);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    setSubmitError(null);
  }, []);

  const closeAuthModalIfPossible = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.getParent()?.goBack?.();
  }, [navigation]);

  const handleLogin = useCallback(async () => {
    const nextPhoneError = validatePhone(phone);
    const nextPasswordError = validatePassword(password);

    setPhoneTouched(true);
    setPasswordTouched(true);
    setSubmitError(null);

    if (nextPhoneError || nextPasswordError || loading) {
      return;
    }

    Keyboard.dismiss();

    if (isMountedRef.current) {
      setLoading(true);
    }

    try {
      await login({
        phone: normalizePhonePreview(phone),
        password,
      });

      if (!isMountedRef.current) return;

      closeAuthModalIfPossible();
    } catch (err) {
      if (!isMountedRef.current) return;

      const message =
        err instanceof Error
          ? err.message
          : "Unable to sign in right now. Please try again.";

      setSubmitError(message);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [phone, password, loading, closeAuthModalIfPossible]);

  return (
    <AppScreen scroll={false} keyboardAvoiding={false} padded={false}>
      <KeyboardAvoidingView
        style={rootStyle}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={contentStyle}
        >
          <AppEntrance>
            <View style={topSectionStyle}>
              <View style={brandRowStyle}>
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
                    Sign in to continue
                  </AppText>
                </View>
              </View>
            </View>
          </AppEntrance>

          <AppEntrance delay={40}>
            <View style={formShellStyle}>
              <View style={formTopStyle}>
                <AppText variant="titleLg">{FORM_TITLE}</AppText>
                <AppText
                  variant="bodySm"
                  tone="secondary"
                  style={formTopHintStyle}
                >
                  {LOGIN_HINT}
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
                  error={phoneError ?? undefined}
                  onChangeText={handlePhoneChange}
                  onBlur={() => setPhoneTouched(true)}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  leftSlot={
                    <Ionicons
                      name="call-outline"
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                  }
                />
              </View>

              <View style={fieldGroupStyle}>
                <AppInput
                  ref={passwordRef}
                  label="Password"
                  placeholder="Enter your password"
                  secureTextEntry={secure}
                  value={password}
                  error={passwordError ?? undefined}
                  onChangeText={handlePasswordChange}
                  onBlur={() => setPasswordTouched(true)}
                  returnKeyType="done"
                  autoCorrect={false}
                  autoCapitalize="none"
                  textContentType="password"
                  onSubmitEditing={handleLogin}
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
                        secure ? "Show password" : "Hide password"
                      }
                      onPress={toggleSecure}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={secure ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    </Pressable>
                  }
                />
              </View>

              <View style={forgotWrapStyle}>
                <Pressable
                  onPress={() => navigation.navigate("ForgotPassword")}
                  style={({ pressed }) => [
                    forgotPressableStyle,
                    pressed ? { opacity: 0.7 } : null,
                  ]}
                >
                  <AppText variant="label" tone="link" weight="700">
                    Forgot password?
                  </AppText>
                </Pressable>
              </View>

              {submitError ? (
                <View style={fieldGroupStyle}>
                  <InlineAlert tone="error" message={submitError} />
                </View>
              ) : null}

              <View style={buttonWrapStyle}>
                <AppButton
                  title="Sign In"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={!canSubmit}
                  variant="primary"
                />
              </View>
            </View>
          </AppEntrance>

          <View style={footerStyle}>
            <Pressable
              onPress={() =>
                navigation.navigate("Register", {
                  forcedRole: "employer",
                  intent: "post_job",
                })
              }
              style={({ pressed }) => [
                footerPrimaryLinkStyle,
                pressed ? { opacity: 0.72 } : null,
              ]}
            >
              <View style={signupRowStyle}>
                <AppText variant="bodySm" tone="secondary">
                  Want to post jobs?{" "}
                </AppText>
                <AppText variant="bodySm" tone="link" weight="700">
                  Create Employer Account
                </AppText>
              </View>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate("Terms")}
              style={({ pressed }) => [pressed ? { opacity: 0.72 } : null]}
            >
              <View style={legalWrapStyle}>
                <AppText variant="caption" tone="secondary" align="center">
                  By continuing you agree to our Terms
                </AppText>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
