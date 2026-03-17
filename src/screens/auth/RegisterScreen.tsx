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
  Pressable,
  ScrollView,
  View,
  Image,
  TextInput,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

import { requestRegistrationOtp } from "../../auth/auth.service";
import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppText } from "../../ui/AppText";
import { AppInput } from "../../ui/AppInput";
import { AppButton } from "../../ui/AppButton";
import { InlineAlert } from "../../ui/InlineAlert";
import { AppEntrance } from "../../ui/AppEntrance";

type Role = "employer" | "job_seeker";

function validateFullName(value: string): string | null {
  if (!value.trim()) return "Full name is required.";
  if (value.trim().length < 2) return "Enter at least 2 characters.";
  return null;
}

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

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();

  const fullNameRef = useRef<TextInput | null>(null);
  const phoneRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);
  const confirmPasswordRef = useRef<TextInput | null>(null);
  const isMountedRef = useRef(true);

  const forcedRole: Role | null =
    route.params?.forcedRole === "job_seeker"
      ? "job_seeker"
      : route.params?.forcedRole === "employer"
        ? "employer"
        : null;

  const premiumIntent = route.params?.intent === "premium_upgrade";
  const postJobIntent = route.params?.intent === "post_job";

  const defaultRole: Role = forcedRole
    ? forcedRole
    : route.params?.role === "employer"
      ? "employer"
      : "job_seeker";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>(defaultRole);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [fullNameTouched, setFullNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const roleLocked = Boolean(forcedRole);
  const resolvedRole: Role = forcedRole ?? role;

  const fullNameError = useMemo(() => {
    if (!fullNameTouched) return null;
    return validateFullName(fullName);
  }, [fullName, fullNameTouched]);

  const phoneError = useMemo(() => {
    if (!phoneTouched) return null;
    return validateUgandaPhone(phone);
  }, [phone, phoneTouched]);

  const passwordError = useMemo(() => {
    if (!passwordTouched) return null;
    return validatePassword(password);
  }, [password, passwordTouched]);

  const confirmPasswordError = useMemo(() => {
    if (!confirmPasswordTouched) return null;
    return validateConfirmPassword(password, confirmPassword);
  }, [password, confirmPassword, confirmPasswordTouched]);

  const canSubmit = useMemo(() => {
    return (
      !validateFullName(fullName) &&
      !validateUgandaPhone(phone) &&
      !validatePassword(password) &&
      !validateConfirmPassword(password, confirmPassword) &&
      !loading
    );
  }, [fullName, phone, password, confirmPassword, loading]);

  const lockedRoleMessage =
    forcedRole === "job_seeker"
      ? "This account will be created as a Job Seeker."
      : "This account will be created as an Employer.";

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
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.screenX,
    }),
    [theme.spacing.lg, theme.spacing.md, theme.spacing.screenX],
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
      marginBottom: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const roleSectionStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const roleSectionTitleStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const roleGridStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
    }),
    [],
  );

  const submitErrorWrapStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: theme.spacing.sm,
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
      paddingTop: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const inlineRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      flexWrap: "wrap",
    }),
    [],
  );

  const handleFullNameChange = useCallback((value: string) => {
    setFullName(value);
    setSubmitError(null);
  }, []);

  const handlePhoneChange = useCallback((value: string) => {
    setPhone(value);
    setSubmitError(null);
  }, []);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    setSubmitError(null);
  }, []);

  const handleConfirmPasswordChange = useCallback((value: string) => {
    setConfirmPassword(value);
    setSubmitError(null);
  }, []);

  const handleRegister = useCallback(async () => {
    const nextFullNameError = validateFullName(fullName);
    const nextPhoneError = validateUgandaPhone(phone);
    const nextPasswordError = validatePassword(password);
    const nextConfirmPasswordError = validateConfirmPassword(
      password,
      confirmPassword,
    );

    setFullNameTouched(true);
    setPhoneTouched(true);
    setPasswordTouched(true);
    setConfirmPasswordTouched(true);
    setSubmitError(null);

    if (
      nextFullNameError ||
      nextPhoneError ||
      nextPasswordError ||
      nextConfirmPasswordError ||
      loading
    ) {
      return;
    }

    Keyboard.dismiss();

    if (isMountedRef.current) {
      setLoading(true);
    }

    try {
      await requestRegistrationOtp({
        phone: phone.trim(),
        full_name: fullName.trim(),
        role: resolvedRole,
        password,
      });

      if (!isMountedRef.current) return;

      navigation.navigate("VerifyOtp", {
        phone: phone.trim(),
        password,
        role: resolvedRole,
        intent: premiumIntent
          ? "premium_upgrade"
          : postJobIntent
            ? "post_job"
            : undefined,
      });
    } catch (err) {
      if (!isMountedRef.current) return;

      setSubmitError(
        err instanceof Error
          ? err.message
          : "Unable to send verification code.",
      );
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    fullName,
    phone,
    password,
    confirmPassword,
    loading,
    resolvedRole,
    premiumIntent,
    postJobIntent,
    navigation,
  ]);

  function RoleOption({
    value,
    label,
    icon,
    isLeft = false,
  }: {
    value: Role;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    isLeft?: boolean;
  }) {
    const selected = resolvedRole === value;

    return (
      <Pressable
        onPress={() => setRole(value)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={({ pressed }) => [
          {
            flex: 1,
            minHeight: 54,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            justifyContent: "center",
            marginRight: isLeft ? theme.spacing.sm : 0,
            backgroundColor: selected
              ? theme.colors.bgSurfaceMuted
              : theme.colors.bgApp,
            borderColor: selected
              ? theme.colors.primary
              : theme.colors.borderDefault,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ marginRight: theme.spacing.xs }}>
            <Ionicons
              name={icon}
              size={18}
              color={
                selected ? theme.colors.primary : theme.colors.textSecondary
              }
            />
          </View>
          <AppText
            variant="labelLg"
            tone={selected ? "primary" : "secondary"}
            weight="700"
          >
            {label}
          </AppText>
        </View>
      </Pressable>
    );
  }

  return (
    <AppScreen scroll={false} keyboardAvoiding={false} padded={false}>
      <KeyboardAvoidingView
        style={rootStyle}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
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
            <View style={topSectionStyle}>
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
                    Create your account
                  </AppText>
                </View>
              </View>
            </View>
          </AppEntrance>

          <AppEntrance delay={40}>
            <View style={formShellStyle}>
              <View style={formTopStyle}>
                <AppText variant="titleLg">Registration details</AppText>
                <AppText
                  variant="bodySm"
                  tone="secondary"
                  style={formTopHintStyle}
                >
                  We will verify your phone number before your account is
                  activated.
                </AppText>
              </View>

              <View style={fieldGroupStyle}>
                <AppInput
                  ref={fullNameRef}
                  label="Full name"
                  value={fullName}
                  onChangeText={handleFullNameChange}
                  onBlur={() => setFullNameTouched(true)}
                  placeholder="Enter your full name"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  leftSlot={
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                  }
                  error={fullNameError ?? undefined}
                />
              </View>

              <View style={fieldGroupStyle}>
                <AppInput
                  ref={phoneRef}
                  label="Phone number"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="+256 7XX XXX XXX"
                  keyboardType="phone-pad"
                  autoCorrect={false}
                  autoCapitalize="none"
                  textContentType="telephoneNumber"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
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

              {roleLocked ? (
                <View style={roleSectionStyle}>
                  <InlineAlert tone="info" message={lockedRoleMessage} />
                </View>
              ) : (
                <View style={roleSectionStyle}>
                  <View style={roleSectionTitleStyle}>
                    <AppText variant="labelLg">Account type</AppText>
                  </View>

                  <View style={roleGridStyle}>
                    <RoleOption
                      value="job_seeker"
                      label="Job Seeker"
                      icon="person-outline"
                      isLeft
                    />
                    <RoleOption
                      value="employer"
                      label="Employer"
                      icon="briefcase-outline"
                    />
                  </View>
                </View>
              )}

              <View style={fieldGroupStyle}>
                <AppInput
                  ref={passwordRef}
                  label="Password"
                  value={password}
                  onChangeText={handlePasswordChange}
                  onBlur={() => setPasswordTouched(true)}
                  placeholder="Create a password"
                  secureTextEntry={!showPassword}
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
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
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
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  onBlur={() => setConfirmPasswordTouched(true)}
                  placeholder="Re-enter your password"
                  secureTextEntry={!showConfirmPassword}
                  autoCorrect={false}
                  autoCapitalize="none"
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
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
                <View style={submitErrorWrapStyle}>
                  <InlineAlert tone="error" message={submitError} />
                </View>
              ) : null}

              <View style={buttonWrapStyle}>
                <AppButton
                  title="Continue"
                  onPress={handleRegister}
                  loading={loading}
                  disabled={!canSubmit}
                  variant="primary"
                />
              </View>
            </View>
          </AppEntrance>

          <View style={footerStyle}>
            <Pressable
              onPress={() => navigation.navigate("Login")}
              style={({ pressed }) => [pressed ? { opacity: 0.72 } : null]}
            >
              <View style={inlineRowStyle}>
                <AppText variant="bodySm" tone="secondary">
                  Already have an account?{" "}
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
