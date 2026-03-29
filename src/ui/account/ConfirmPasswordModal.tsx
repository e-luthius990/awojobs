import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";

import { reauthenticateForSensitiveAction } from "../../auth/auth.service";
import { AppButton } from "../AppButton";
import { AppCard } from "../AppCard";
import { AppText } from "../AppText";
import { InlineAlert } from "../InlineAlert";
import { useTheme } from "../../theme/useTheme";

type ConfirmPasswordModalProps = {
  visible: boolean;
  phoneNumber: string | null;
  title: string;
  message: string;
  confirmLabel?: string;
  busyLabel?: string;
  onCancel: () => void;
  onSuccess: () => void | Promise<void>;
};

export default function ConfirmPasswordModal({
  visible,
  phoneNumber,
  title,
  message,
  confirmLabel = "Continue",
  busyLabel = "Checking...",
  onCancel,
  onSuccess,
}: ConfirmPasswordModalProps) {
  const { theme } = useTheme();

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setPassword("");
      setBusy(false);
      setError(null);
    }
  }, [visible]);

  const overlayStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: theme.spacing.lg,
    }),
    [theme.spacing.lg],
  );

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const inputStyle = useMemo(
    () => ({
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      backgroundColor: theme.colors.bgSurface,
      color: theme.colors.text,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      fontSize: 16,
    }),
    [
      theme.colors.bgSurface,
      theme.colors.borderMuted,
      theme.colors.text,
      theme.radius.lg,
      theme.spacing.md,
    ],
  );

  const actionRowStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const handleConfirm = useCallback(async () => {
    if (busy) return;

    const phone = phoneNumber?.trim() ?? "";
    if (!phone) {
      setError("Phone number is missing on this account.");
      return;
    }

    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      setError("Please enter your password.");
      return;
    }

    try {
      setBusy(true);
      setError(null);

      await reauthenticateForSensitiveAction({
        phone,
        password: trimmedPassword,
      });

      await onSuccess();

      setPassword("");
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Password confirmation failed.",
      );
    } finally {
      setBusy(false);
    }
  }, [busy, onSuccess, password, phoneNumber]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={busy ? undefined : onCancel}
    >
      <Pressable style={overlayStyle} onPress={busy ? undefined : onCancel}>
        <Pressable onPress={() => undefined}>
          <AppCard variant="elevated" padding="lg">
            <View style={contentStyle}>
              <AppText variant="titleLg">{title}</AppText>

              <AppText variant="bodySm" tone="secondary">
                {message}
              </AppText>

              {error ? (
                <InlineAlert
                  tone="error"
                  title="Confirmation failed"
                  message={error}
                />
              ) : null}

              <View style={{ gap: theme.spacing.xs }}>
                <AppText variant="caption" tone="secondary" uppercase>
                  Password
                </AppText>

                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={theme.colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                  style={inputStyle}
                />
              </View>

              <View style={actionRowStyle}>
                <AppButton
                  title={busy ? busyLabel : confirmLabel}
                  onPress={() => {
                    void handleConfirm();
                  }}
                  variant="primary"
                  disabled={busy}
                />

                <AppButton
                  title="Cancel"
                  onPress={onCancel}
                  variant="secondary"
                  disabled={busy}
                />
              </View>
            </View>
          </AppCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
