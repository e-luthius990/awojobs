import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Keyboard,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { supabase } from "../../core/supabase";

export default function ResetCodeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const phone = route.params?.phone;

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (loading) return;

    Keyboard.dismiss();
    setError(null);

    if (!code || code.length < 4) {
      setError("Enter valid reset code.");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke(
        "confirm_password_reset",
        {
          body: {
            phone,
            token: code,
            new_password: password,
          },
        },
      );

      if (error || data?.error) {
        throw new Error(data?.error || "Invalid or expired code.");
      }

      setSuccess(true);

      // Small delay for UX polish
      setTimeout(() => {
        navigation.navigate("Login");
      }, 1200);
    } catch (err: any) {
      setError(err?.message ?? "Reset failed.");
    } finally {
      setLoading(false);
    }
  }, [code, password, confirmPassword, phone, loading, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Enter reset code</Text>

        <Text style={styles.subtitle}>Enter the code sent to your phone.</Text>

        <TextInput
          placeholder="6-digit code"
          placeholderTextColor="#94A3B8"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
          style={styles.input}
        />

        <TextInput
          placeholder="New password"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        <TextInput
          placeholder="Confirm password"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={styles.input}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        {success && (
          <Text style={styles.successText}>Password reset successful.</Text>
        )}

        <Pressable
          onPress={handleConfirm}
          disabled={loading}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {loading ? "Resetting..." : "Confirm Reset"}
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
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
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
  errorText: {
    color: "#DC2626",
    marginBottom: 10,
    fontSize: 13,
  },
  successText: {
    color: "#16A34A",
    marginBottom: 10,
    fontSize: 13,
  },
  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
