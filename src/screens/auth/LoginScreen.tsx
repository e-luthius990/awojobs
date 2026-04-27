import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
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
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { login } from "../../auth/auth.service";
import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppText } from "../../ui/AppText";
import { InlineAlert } from "../../ui/InlineAlert";
import { AppEntrance } from "../../ui/AppEntrance";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

const LOGIN_HINT = "Use the phone number and password linked to your account.";

type LoginNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  "Login"
>;

type LoginRouteProp = RouteProp<AuthStackParamList, "Login">;

function validatePhone(value: string): string | null {
  const cleaned = value.replace(/\D/g, "");

  if (cleaned.startsWith("256") && cleaned.length === 12) return null;
  if (cleaned.startsWith("0") && cleaned.length === 10) return null;
  if (cleaned.startsWith("7") && cleaned.length === 9) return null;

  return "Enter a valid Uganda phone number.";
}

function validatePassword(value: string): string | null {
  if (!value) return "Password is required.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export default function LoginScreen() {
  const navigation = useNavigation<LoginNavigationProp>();
  const route = useRoute<LoginRouteProp>();
  const { theme } = useTheme();

  const passwordRef = useRef<TextInput | null>(null);
  const isMountedRef = useRef(true);

  const forcedRole = route.params?.forcedRole;
  const intent = route.params?.intent;

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
      paddingHorizontal: theme.spacing.screenX,
      paddingTop: 56,
      paddingBottom: 40,
    }),
    [theme.spacing.screenX],
  );

  const innerWrapStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      width: "100%",
      maxWidth: 440,
      alignSelf: "center",
    }),
    [],
  );

  const layoutStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      justifyContent: "space-between",
    }),
    [],
  );

  const topContentStyle = useMemo<ViewStyle>(
    () => ({
      width: "100%",
    }),
    [],
  );

  const headerStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      marginBottom: 24,
    }),
    [],
  );

  const logoWrapStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
      width: "100%",
    }),
    [],
  );

  const logoStyle = useMemo<ViewStyle>(
    () => ({
      width: 180,
      height: 180,
    }),
    [],
  );

  const subtitleStyle = useMemo<TextStyle>(
    () => ({
      textAlign: "center",
      maxWidth: 340,
      lineHeight: 24,
      fontSize: 16,
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
      marginBottom: 14,
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
    [theme.colors.bgSurface, theme.colors.borderDefault],
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

  const forgotWrapStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "flex-end",
      marginTop: 2,
      marginBottom: 20,
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

  const footerStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      marginTop: 20,
      paddingBottom: 8,
    }),
    [],
  );

  const footerRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      flexWrap: "wrap",
    }),
    [],
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
    }
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
    setLoading(true);

    try {
      const result = await login({
        phone,
        password,
      });

      if (!isMountedRef.current) return;

      if (!result.ok) {
        setSubmitError(result.error.message);
        return;
      }

      closeAuthModalIfPossible();
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [phone, password, loading, closeAuthModalIfPossible]);

  const handleOpenRegister = useCallback(() => {
    navigation.navigate("Register", {
      forcedRole: forcedRole ?? "employer",
      intent,
    });
  }, [navigation, forcedRole, intent]);

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
          <View style={innerWrapStyle}>
            <View style={layoutStyle}>
              <View style={topContentStyle}>
                <AppEntrance>
                  <View style={headerStyle}>
                    <View style={logoWrapStyle}>
                      <Image
                        source={require("../../../assets/logo.png")}
                        style={logoStyle}
                        resizeMode="contain"
                      />
                    </View>

                    <AppText
                      variant="body"
                      tone="secondary"
                      style={subtitleStyle}
                    >
                      {LOGIN_HINT}
                    </AppText>
                  </View>
                </AppEntrance>

                <AppEntrance delay={40}>
                  <View style={formStyle}>
                    <View style={fieldBlockStyle}>
                      <View
                        style={[
                          inputShellStyle,
                          phoneError ? inputErrorShellStyle : null,
                        ]}
                      >
                        <TextInput
                          placeholder="+256 7XX XXX XXX"
                          placeholderTextColor={theme.colors.textTertiary}
                          keyboardType="phone-pad"
                          autoCorrect={false}
                          autoCapitalize="none"
                          textContentType="telephoneNumber"
                          value={phone}
                          onChangeText={handlePhoneChange}
                          onBlur={() => setPhoneTouched(true)}
                          returnKeyType="next"
                          onSubmitEditing={() => passwordRef.current?.focus()}
                          style={inputStyle}
                        />
                      </View>

                      {phoneError ? (
                        <View style={{ marginTop: 8 }}>
                          <AppText variant="caption" tone="error">
                            {phoneError}
                          </AppText>
                        </View>
                      ) : null}
                    </View>

                    <View style={fieldBlockStyle}>
                      <View
                        style={[
                          inputShellStyle,
                          passwordError ? inputErrorShellStyle : null,
                        ]}
                      >
                        <TextInput
                          ref={passwordRef}
                          placeholder="Password"
                          placeholderTextColor={theme.colors.textTertiary}
                          secureTextEntry={secure}
                          value={password}
                          onChangeText={handlePasswordChange}
                          onBlur={() => setPasswordTouched(true)}
                          returnKeyType="done"
                          autoCorrect={false}
                          autoCapitalize="none"
                          textContentType="password"
                          onSubmitEditing={handleLogin}
                          style={inputStyle}
                        />

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
                      </View>

                      {passwordError ? (
                        <View style={{ marginTop: 8 }}>
                          <AppText variant="caption" tone="error">
                            {passwordError}
                          </AppText>
                        </View>
                      ) : null}
                    </View>

                    <View style={forgotWrapStyle}>
                      <Pressable
                        onPress={() => navigation.navigate("ForgotPassword")}
                        style={({ pressed }) =>
                          pressed ? { opacity: 0.72 } : null
                        }
                      >
                        <AppText variant="bodySm" tone="secondary">
                          Forgot Password?
                        </AppText>
                      </Pressable>
                    </View>

                    {submitError ? (
                      <View style={{ marginBottom: 14 }}>
                        <InlineAlert tone="error" message={submitError} />
                      </View>
                    ) : null}

                    <Pressable
                      onPress={handleLogin}
                      disabled={!canSubmit}
                      style={({ pressed }) => [
                        buttonStyle,
                        pressed && canSubmit ? { opacity: 0.9 } : null,
                      ]}
                    >
                      {loading ? (
                        <ActivityIndicator color={theme.colors.textInverse} />
                      ) : (
                        <AppText style={buttonTextStyle}>Log In</AppText>
                      )}
                    </Pressable>
                  </View>
                </AppEntrance>
              </View>

              <View style={footerStyle}>
                <Pressable
                  onPress={handleOpenRegister}
                  style={({ pressed }) => (pressed ? { opacity: 0.72 } : null)}
                >
                  <View style={footerRowStyle}>
                    <AppText variant="bodySm" tone="secondary">
                      Don&apos;t have an account?{" "}
                    </AppText>
                    <AppText variant="bodySm" tone="link" weight="700">
                      Create Employer Account
                    </AppText>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
