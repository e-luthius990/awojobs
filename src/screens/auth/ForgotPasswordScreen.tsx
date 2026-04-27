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
  TextInput,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { requestPasswordReset } from "../../auth/auth.service";
import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppText } from "../../ui/AppText";
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

  const titleStyle = useMemo<TextStyle>(
    () => ({
      textAlign: "center",
      marginTop: 44,
      marginBottom: 10,
      fontSize: 30,
      lineHeight: 36,
      letterSpacing: -0.5,
      color: theme.colors.textPrimary,
    }),
    [theme.colors.textPrimary],
  );

  const subtitleStyle = useMemo<TextStyle>(
    () => ({
      textAlign: "center",
      maxWidth: 320,
      lineHeight: 23,
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
      const result = await requestPasswordReset({ phone: phone.trim() });

      if (!isMountedRef.current) return;

      if (!result.ok) {
        setMessage(result.error.message);
        setMessageTone("error");
        return;
      }

      setMessage("If your account exists, a reset code was sent.");
      setMessageTone("info");

      navigation.navigate("ResetCode", {
        phone: phone.trim(),
      });
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [phone, loading, navigation]);

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

                <AppText variant="h2" weight="700" style={titleStyle}>
                  Reset password
                </AppText>

                <AppText variant="body" tone="secondary" style={subtitleStyle}>
                  Enter your phone number to receive a reset code.
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
                      returnKeyType="done"
                      onSubmitEditing={handleReset}
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
                  {message ? (
                    <InlineAlert tone={messageTone} message={message} />
                  ) : (
                    <InlineAlert
                      tone="info"
                      message="We will send a verification code before you can create a new password."
                    />
                  )}
                </View>

                <Pressable
                  onPress={handleReset}
                  disabled={!canSubmit}
                  style={({ pressed }) => [
                    buttonStyle,
                    pressed && canSubmit ? { opacity: 0.9 } : null,
                  ]}
                >
                  <AppText style={buttonTextStyle}>
                    {loading ? "Sending..." : "Send Code"}
                  </AppText>
                </Pressable>
              </View>
            </AppEntrance>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
