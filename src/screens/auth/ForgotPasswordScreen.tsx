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
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../core/supabase";

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleReset = useCallback(async () => {
    if (loading) return;

    Keyboard.dismiss();
    setMessage(null);

    const trimmedPhone = phone.trim();

    if (!trimmedPhone) {
      setMessage("Phone number is required.");
      return;
    }

    try {
      setLoading(true);

      await supabase.functions.invoke("request_password_reset", {
        body: { phone: trimmedPhone },
      });

      // Always generic
      setMessage("If your account exists, a reset code was sent.");

      // Move to confirmation screen
      navigation.navigate("ResetCode", {
        phone: trimmedPhone,
      });
    } catch {
      setMessage("Unable to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [phone, loading, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Pressable
        onPress={() => navigation.goBack()}
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backPressed,
        ]}
      >
        <Ionicons name="arrow-back" size={18} color="#0F172A" />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.title}>Reset password</Text>

        <Text style={styles.subtitle}>
          Enter your phone number and we’ll send a reset code if your account
          exists.
        </Text>

        <TextInput
          placeholder="Uganda Phone Number"
          placeholderTextColor="#94A3B8"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
        />

        <View style={styles.messageContainer}>
          {message && <Text style={styles.message}>{message}</Text>}
        </View>

        <Pressable
          onPress={handleReset}
          disabled={loading}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {loading ? "Sending..." : "Send Code"}
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
    padding: 20,
  },

  /* Back Button */
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    elevation: 3,
  },

  backPressed: {
    opacity: 0.7,
  },

  backText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },

  /* Card */
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
    color: "#0F172A",
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

  messageContainer: {
    minHeight: 20,
    marginBottom: 8,
  },

  message: {
    fontSize: 13,
    color: "#2563EB",
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
