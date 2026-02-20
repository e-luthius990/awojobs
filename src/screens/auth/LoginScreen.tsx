import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Keyboard,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { login } from "../../auth/auth.service";
import { supabase } from "../../core/supabase";

export default function LoginScreen() {
  const navigation = useNavigation<any>();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSecure = useCallback(() => {
    setSecure((prev) => !prev);
  }, []);

  const handleLogin = useCallback(async () => {
    if (loading) return;

    Keyboard.dismiss();
    setError(null);

    const trimmedPhone = phone.trim();

    if (!trimmedPhone || !password) {
      setError("Phone and password are required.");
      return;
    }

    try {
      setLoading(true);

      await login({
        phone: trimmedPhone,
        password,
      });

      // ❌ No navigation here
      // RootNavigator reacts to session change
    } catch (err: any) {
      setError(err?.message ?? "Unable to login.");
    } finally {
      setLoading(false);
    }
  }, [phone, password, loading]);

  const buttonLabel = useMemo(
    () => (loading ? "Signing in..." : "Login"),
    [loading],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ================= LOGO OUTSIDE CARD ================= */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* ================= CARD ================= */}
      <View style={styles.card}>
        <Text style={styles.title}>Welcome back</Text>

        <Text style={styles.subtitle}>Sign in to continue.</Text>

        <TextInput
          placeholder="Uganda Phone Number"
          placeholderTextColor="#94A3B8"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
        />

        {/* Password with toggle */}
        <View style={styles.passwordWrapper}>
          <TextInput
            placeholder="Password"
            placeholderTextColor="#94A3B8"
            secureTextEntry={secure}
            value={password}
            onChangeText={setPassword}
            style={styles.passwordInput}
          />

          <Pressable onPress={toggleSecure} style={styles.eyeButton}>
            <Ionicons
              name={secure ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#64748B"
            />
          </Pressable>
        </View>

        <View style={styles.errorContainer}>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate("ForgotPassword")}
          style={styles.link}
        >
          <Text style={styles.linkText}>Forgot password?</Text>
        </Pressable>
      </View>

      {/* ================= REGISTER BELOW CARD ================= */}
      <View style={styles.bottomSection}>
        <Pressable onPress={() => navigation.navigate("Register")}>
          <Text style={styles.registerText}>
            Not registered yet?{" "}
            <Text style={styles.registerBold}>Create Account</Text>
          </Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate("Terms")}>
          <Text style={styles.termsText}>
            By continuing you agree to our Terms of Use
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F8FC",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },

  logo: {
    width: 250,
    height: 150,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172A",
  },

  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 6,
    marginBottom: 20,
  },

  input: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 12,
    fontSize: 15,
    color: "#0F172A",
  },

  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    marginBottom: 12,
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#0F172A",
  },

  eyeButton: {
    paddingHorizontal: 14,
  },

  errorContainer: {
    minHeight: 20,
    justifyContent: "center",
    marginBottom: 8,
  },

  errorText: {
    color: "#DC2626",
    fontSize: 13,
  },

  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 6,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  link: {
    alignItems: "center",
    marginTop: 14,
  },

  linkText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "600",
  },

  bottomSection: {
    alignItems: "center",
    marginTop: 28,
  },

  registerText: {
    fontSize: 14,
    color: "#64748B",
  },

  registerBold: {
    fontWeight: "800",
    color: "#2563EB",
  },

  termsText: {
    marginTop: 10,
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
});
