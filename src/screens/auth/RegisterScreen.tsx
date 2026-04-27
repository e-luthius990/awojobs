import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { requestRegistrationOtp } from "../../auth/auth.service";
import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppText } from "../../ui/AppText";
import { InlineAlert } from "../../ui/InlineAlert";
import { AppEntrance } from "../../ui/AppEntrance";
import type {
  AuthIntent,
  AuthRole,
  AuthStackParamList,
} from "../../navigation/AuthNavigator";

type Role = AuthRole;

type RegisterScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  "Register"
>;
type RegisterScreenRouteProp = RouteProp<AuthStackParamList, "Register">;

const SUBTITLE =
  "Create your account and verify your phone number to continue.";

function validateFullName(value: string): string | null {
  if (!value.trim()) return "Full name is required.";
  if (value.trim().length < 2) return "Enter at least 2 characters.";
  return null;
}

function validateBusinessName(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) return null;
  if (trimmed.length < 2) return "Enter at least 2 characters.";
  if (trimmed.length > 120) return "Business name is too long.";

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
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const route = useRoute<RegisterScreenRouteProp>();
  const { theme } = useTheme();

  const fullNameRef = useRef<TextInput | null>(null);
  const businessNameRef = useRef<TextInput | null>(null);
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

  const intent: AuthIntent | undefined = route.params?.intent;

  const defaultRole: Role = forcedRole
    ? forcedRole
    : route.params?.role === "employer"
      ? "employer"
      : "job_seeker";

  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>(defaultRole);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [fullNameTouched, setFullNameTouched] = useState(false);
  const [businessNameTouched, setBusinessNameTouched] = useState(false);
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

  useEffect(() => {
    if (resolvedRole !== "employer" && businessName) {
      setBusinessName("");
      setBusinessNameTouched(false);
    }
  }, [resolvedRole, businessName]);

  const fullNameError = useMemo(() => {
    if (!fullNameTouched) return null;
    return validateFullName(fullName);
  }, [fullName, fullNameTouched]);

  const businessNameError = useMemo(() => {
    if (resolvedRole !== "employer" || !businessNameTouched) return null;
    return validateBusinessName(businessName);
  }, [businessName, businessNameTouched, resolvedRole]);

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
      !(resolvedRole === "employer" && validateBusinessName(businessName)) &&
      !validateUgandaPhone(phone) &&
      !validatePassword(password) &&
      !validateConfirmPassword(password, confirmPassword) &&
      !loading
    );
  }, [
    fullName,
    businessName,
    resolvedRole,
    phone,
    password,
    confirmPassword,
    loading,
  ]);

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
      paddingHorizontal: theme.spacing.screenX,
      paddingTop: 28,
      paddingBottom: 32,
    }),
    [theme.spacing.screenX],
  );

  const innerWrapStyle = useMemo<ViewStyle>(
    () => ({
      width: "100%",
      maxWidth: 440,
      alignSelf: "center",
    }),
    [],
  );

  const headerStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      marginBottom: 24,
      paddingTop: 12,
    }),
    [],
  );

  const backButtonStyle = useMemo<ViewStyle>(
    () => ({
      position: "absolute",
      top: 0,
      left: 0,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    }),
    [],
  );

  const subtitleStyle = useMemo<TextStyle>(
    () => ({
      textAlign: "center",
      maxWidth: 320,
      lineHeight: 23,
      fontSize: 16,
      marginTop: 44,
    }),
    [],
  );

  const formStyle = useMemo<ViewStyle>(
    () => ({
      width: "100%",
    }),
    [],
  );

  const fieldBlockStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: 12,
    }),
    [],
  );

  const inputShellStyle = useMemo<ViewStyle>(
    () => ({
      minHeight: 58,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurface,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
    }),
    [theme.colors.borderDefault, theme.colors.bgSurface],
  );

  const inputErrorShellStyle = useMemo<ViewStyle>(
    () => ({
      borderColor: theme.colors.error,
    }),
    [theme.colors.error],
  );

  const inputStyle = useMemo<TextStyle>(
    () => ({
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 16,
      paddingVertical: Platform.OS === "ios" ? 16 : 12,
    }),
    [theme.colors.textPrimary],
  );

  const hintTextStyle = useMemo<TextStyle>(
    () => ({
      marginTop: -2,
      marginBottom: 12,
    }),
    [],
  );

  const roleSectionStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: 12,
    }),
    [],
  );

  const roleSectionTitleStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: 10,
    }),
    [],
  );

  const roleGridStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
    }),
    [],
  );

  const submitErrorWrapStyle = useMemo<ViewStyle>(
    () => ({
      marginBottom: 14,
    }),
    [],
  );

  const buttonStyle = useMemo<ViewStyle>(
    () => ({
      height: 56,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      backgroundColor: canSubmit
        ? theme.colors.primary
        : theme.colors.borderDefault,
    }),
    [canSubmit, theme.colors.primary, theme.colors.borderDefault],
  );

  const buttonTextStyle = useMemo<TextStyle>(
    () => ({
      color: canSubmit ? theme.colors.textInverse : theme.colors.textSecondary,
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 0.2,
    }),
    [canSubmit, theme.colors.textInverse, theme.colors.textSecondary],
  );

  const roleOptionBaseStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      minHeight: 54,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      justifyContent: "center",
    }),
    [theme.radius.xl, theme.spacing.md, theme.spacing.sm],
  );

  const handleFullNameChange = useCallback((value: string) => {
    setFullName(value);
    setSubmitError(null);
  }, []);

  const handleBusinessNameChange = useCallback((value: string) => {
    setBusinessName(value);
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
    const nextBusinessNameError =
      resolvedRole === "employer" ? validateBusinessName(businessName) : null;
    const nextPhoneError = validateUgandaPhone(phone);
    const nextPasswordError = validatePassword(password);
    const nextConfirmPasswordError = validateConfirmPassword(
      password,
      confirmPassword,
    );

    setFullNameTouched(true);
    setBusinessNameTouched(true);
    setPhoneTouched(true);
    setPasswordTouched(true);
    setConfirmPasswordTouched(true);
    setSubmitError(null);

    if (
      nextFullNameError ||
      nextBusinessNameError ||
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
      const result = await requestRegistrationOtp({
        phone: phone.trim(),
        full_name: fullName.trim(),
        role: resolvedRole,
        password,
        business_name:
          resolvedRole === "employer" && businessName.trim()
            ? businessName.trim()
            : undefined,
      });

      if (!isMountedRef.current) return;

      if (!result.ok) {
        setSubmitError(result.error.message);
        return;
      }

      navigation.navigate("VerifyOtp", {
        phone: phone.trim(),
        password,
        role: resolvedRole,
        intent,
      });
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    fullName,
    businessName,
    phone,
    password,
    confirmPassword,
    loading,
    resolvedRole,
    intent,
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
        onPress={() => {
          if (roleLocked) return;
          setRole(value);
        }}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled: roleLocked }}
        disabled={roleLocked}
        style={({ pressed }) => [
          roleOptionBaseStyle,
          {
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

  const renderTextInputField = ({
    ref,
    value,
    onChangeText,
    onBlur,
    placeholder,
    placeholderTextColor,
    secureTextEntry,
    keyboardType,
    autoCorrect,
    autoCapitalize,
    textContentType,
    returnKeyType,
    onSubmitEditing,
    rightSlot,
    error,
  }: {
    ref?: React.RefObject<TextInput | null>;
    value: string;
    onChangeText: (value: string) => void;
    onBlur: () => void;
    placeholder: string;
    placeholderTextColor: string;
    secureTextEntry?: boolean;
    keyboardType?: "default" | "phone-pad";
    autoCorrect?: boolean;
    autoCapitalize?: "none" | "words";
    textContentType?:
      | "name"
      | "telephoneNumber"
      | "newPassword"
      | "password"
      | "none";
    returnKeyType?: "next" | "done";
    onSubmitEditing?: () => void;
    rightSlot?: React.ReactNode;
    error?: string | null;
  }) => (
    <View style={fieldBlockStyle}>
      <View style={[inputShellStyle, error ? inputErrorShellStyle : null]}>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCorrect={autoCorrect}
          autoCapitalize={autoCapitalize}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          style={inputStyle}
        />
        {rightSlot}
      </View>

      {error ? (
        <View style={{ marginTop: 8 }}>
          <AppText variant="caption" tone="error">
            {error}
          </AppText>
        </View>
      ) : null}
    </View>
  );

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
          <View style={innerWrapStyle}>
            <AppEntrance>
              <View style={headerStyle}>
                <Pressable
                  onPress={() => navigation.goBack()}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  style={({ pressed }) => [
                    backButtonStyle,
                    pressed ? { opacity: 0.72 } : null,
                  ]}
                >
                  <Ionicons
                    name="chevron-back"
                    size={24}
                    color={theme.colors.textPrimary}
                  />
                </Pressable>

                <AppText variant="body" tone="secondary" style={subtitleStyle}>
                  {SUBTITLE}
                </AppText>
              </View>
            </AppEntrance>

            <AppEntrance delay={40}>
              <View style={formStyle}>
                {renderTextInputField({
                  ref: fullNameRef,
                  value: fullName,
                  onChangeText: handleFullNameChange,
                  onBlur: () => setFullNameTouched(true),
                  placeholder: "Full name",
                  placeholderTextColor: theme.colors.textTertiary,
                  autoCapitalize: "words",
                  autoCorrect: false,
                  textContentType: "name",
                  returnKeyType: "next",
                  onSubmitEditing: () => {
                    if (resolvedRole === "employer") {
                      businessNameRef.current?.focus();
                      return;
                    }
                    phoneRef.current?.focus();
                  },
                  error: fullNameError,
                })}

                {resolvedRole === "employer"
                  ? renderTextInputField({
                      ref: businessNameRef,
                      value: businessName,
                      onChangeText: handleBusinessNameChange,
                      onBlur: () => setBusinessNameTouched(true),
                      placeholder: "Business name (optional)",
                      placeholderTextColor: theme.colors.textTertiary,
                      autoCapitalize: "words",
                      autoCorrect: false,
                      textContentType: "none",
                      returnKeyType: "next",
                      onSubmitEditing: () => phoneRef.current?.focus(),
                      error: businessNameError,
                    })
                  : null}

                {renderTextInputField({
                  ref: phoneRef,
                  value: phone,
                  onChangeText: handlePhoneChange,
                  onBlur: () => setPhoneTouched(true),
                  placeholder: "+256 7XX XXX XXX",
                  placeholderTextColor: theme.colors.textTertiary,
                  keyboardType: "phone-pad",
                  autoCapitalize: "none",
                  autoCorrect: false,
                  textContentType: "telephoneNumber",
                  returnKeyType: "next",
                  onSubmitEditing: () => passwordRef.current?.focus(),
                  error: phoneError,
                })}

                {roleLocked ? (
                  <View style={roleSectionStyle}>
                    <InlineAlert tone="info" message={lockedRoleMessage} />
                  </View>
                ) : (
                  <View style={roleSectionStyle}>
                    <View style={roleSectionTitleStyle}>
                      <AppText variant="labelLg" weight="700">
                        Account type
                      </AppText>
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

                {renderTextInputField({
                  ref: passwordRef,
                  value: password,
                  onChangeText: handlePasswordChange,
                  onBlur: () => setPasswordTouched(true),
                  placeholder: "Create password",
                  placeholderTextColor: theme.colors.textTertiary,
                  secureTextEntry: !showPassword,
                  autoCapitalize: "none",
                  autoCorrect: false,
                  textContentType: "newPassword",
                  returnKeyType: "next",
                  onSubmitEditing: () => confirmPasswordRef.current?.focus(),
                  rightSlot: (
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
                  ),
                  error: passwordError,
                })}

                <AppText
                  variant="caption"
                  tone="secondary"
                  style={hintTextStyle}
                >
                  Use at least 8 characters with letters and numbers.
                </AppText>

                {renderTextInputField({
                  ref: confirmPasswordRef,
                  value: confirmPassword,
                  onChangeText: handleConfirmPasswordChange,
                  onBlur: () => setConfirmPasswordTouched(true),
                  placeholder: "Confirm password",
                  placeholderTextColor: theme.colors.textTertiary,
                  secureTextEntry: !showConfirmPassword,
                  autoCapitalize: "none",
                  autoCorrect: false,
                  textContentType: "password",
                  returnKeyType: "done",
                  onSubmitEditing: handleRegister,
                  rightSlot: (
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
                  ),
                  error: confirmPasswordError,
                })}

                {submitError ? (
                  <View style={submitErrorWrapStyle}>
                    <InlineAlert tone="error" message={submitError} />
                  </View>
                ) : null}

                <Pressable
                  onPress={handleRegister}
                  disabled={!canSubmit}
                  style={({ pressed }) => [
                    buttonStyle,
                    pressed && canSubmit ? { opacity: 0.9 } : null,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={theme.colors.textInverse} />
                  ) : (
                    <AppText style={buttonTextStyle}>Continue</AppText>
                  )}
                </Pressable>
              </View>
            </AppEntrance>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
