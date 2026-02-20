import React from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { normalizeUgPhone } from "@utils/normalizeUgPhone";

type Props = {
  visible: boolean;
  onClose: () => void;
  submitting: boolean;
  name: string;
  setName: (v: string) => void;
  phoneInput: string;
  setPhoneInput: (v: string) => void;
  onSubmit: () => Promise<void>;
};

function isValidUgPhone(input: string) {
  const normalized = normalizeUgPhone(input);
  return /^\+2567\d{8}$/.test(normalized);
}

export default function JobCardApplyModal({
  visible,
  onClose,
  submitting,
  name,
  setName,
  phoneInput,
  setPhoneInput,
  onSubmit,
}: Props) {
  const nameValid = name.trim().length >= 2;
  const phoneValid = isValidUgPhone(phoneInput);

  const canSubmit = nameValid && phoneValid && !submitting;

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}>
          <Pressable style={{ flex: 1 }} onPress={handleClose} />

          <View
            style={{
              marginTop: "auto",
              backgroundColor: "#fff",
              padding: 20,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                marginBottom: 12,
              }}
            >
              Apply for this job
            </Text>

            <TextInput
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              editable={!submitting}
              autoCapitalize="words"
              style={{
                borderWidth: 1,
                borderColor: nameValid ? "#E5E7EB" : "#DC2626",
                borderRadius: 12,
                padding: 12,
                marginBottom: 10,
              }}
            />

            <TextInput
              placeholder="07XXXXXXXX"
              value={phoneInput}
              onChangeText={setPhoneInput}
              keyboardType="phone-pad"
              editable={!submitting}
              style={{
                borderWidth: 1,
                borderColor: phoneValid ? "#E5E7EB" : "#DC2626",
                borderRadius: 12,
                padding: 12,
                marginBottom: 14,
              }}
            />

            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              style={{
                backgroundColor: canSubmit ? "#0F172A" : "#94A3B8",
                paddingVertical: 12,
                borderRadius: 999,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "700",
                }}
              >
                {submitting ? "Sending..." : "Submit"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleClose}
              disabled={submitting}
              style={{ marginTop: 12 }}
            >
              <Text
                style={{
                  textAlign: "center",
                  color: "#64748B",
                  fontWeight: "700",
                }}
              >
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
