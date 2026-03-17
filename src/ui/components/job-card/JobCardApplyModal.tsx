import React, { useCallback, useMemo } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { normalizeUgPhone } from "@utils/normalizeUgPhone";

import { useTheme } from "../../../theme/useTheme";
import { AppText } from "../../AppText";
import { AppInput } from "../../AppInput";
import { AppButton } from "../../AppButton";

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
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const nameTrimmed = name.trim();
  const nameValid = nameTrimmed.length >= 2;
  const phoneValid = isValidUgPhone(phoneInput);
  const canSubmit = nameValid && phoneValid && !submitting;

  const rootStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      backgroundColor: theme.colors.bgBackdrop,
      justifyContent: "flex-end",
    }),
    [theme.colors.bgBackdrop],
  );

  const backdropTapAreaStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
    }),
    [],
  );

  const sheetStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: theme.colors.bgSurfaceElevated,
      borderTopLeftRadius: theme.radius.xxl,
      borderTopRightRadius: theme.radius.xxl,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: Math.max(
        theme.spacing.xl,
        insets.bottom + theme.spacing.md,
      ),
      borderTopWidth: theme.hairlineWidth,
      borderTopColor: theme.colors.borderDefault,
      ...theme.shadows.level3,
    }),
    [
      insets.bottom,
      theme.colors.bgSurfaceElevated,
      theme.colors.borderDefault,
      theme.hairlineWidth,
      theme.radius.xxl,
      theme.shadows.level3,
      theme.spacing.lg,
      theme.spacing.md,
      theme.spacing.xl,
    ],
  );

  const handleWrapStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      marginBottom: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const handleStyle = useMemo<ViewStyle>(
    () => ({
      width: 44,
      height: 5,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.borderStrong,
    }),
    [theme.colors.borderStrong, theme.radius.pill],
  );

  const headerRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    }),
    [theme.spacing.lg, theme.spacing.md],
  );

  const headerStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const closeButtonStyle = useMemo<ViewStyle>(
    () => ({
      width: 40,
      height: 40,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.bgSurfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
    }),
    [
      theme.colors.bgSurfaceMuted,
      theme.colors.borderDefault,
      theme.radius.pill,
    ],
  );

  const formStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const helperBoxStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.bgSurfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
    }),
    [
      theme.colors.bgSurfaceMuted,
      theme.colors.borderMuted,
      theme.radius.lg,
      theme.spacing.sm,
      theme.spacing.xs,
    ],
  );

  const actionsStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: theme.spacing.lg,
      gap: theme.spacing.sm,
    }),
    [theme.spacing.lg, theme.spacing.sm],
  );

  const cancelWrapStyle = useMemo<ViewStyle>(
    () => ({
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
    }),
    [],
  );

  const handleClose = useCallback(() => {
    if (submitting) return;
    onClose();
  }, [onClose, submitting]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    void onSubmit();
  }, [canSubmit, onSubmit]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={rootStyle}>
          <Pressable style={backdropTapAreaStyle} onPress={handleClose} />

          <View style={sheetStyle}>
            <View style={handleWrapStyle}>
              <View style={handleStyle} />
            </View>

            <View style={headerRowStyle}>
              <View style={headerStyle}>
                <AppText variant="h3">Apply for this job</AppText>
                <AppText variant="bodySm" tone="secondary">
                  Submit your contact details so the employer can review your
                  application.
                </AppText>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close application form"
                disabled={submitting}
                onPress={handleClose}
                style={({ pressed }) => [
                  closeButtonStyle,
                  pressed && !submitting
                    ? {
                        opacity: 0.92,
                        backgroundColor: theme.colors.buttonGhostBgPressed,
                      }
                    : null,
                  submitting ? { opacity: 0.55 } : null,
                ]}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
            </View>

            <View style={formStyle}>
              <AppInput
                label="Full name"
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
                editable={!submitting}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                error={
                  name.length > 0 && !nameValid
                    ? "Enter at least 2 characters."
                    : undefined
                }
              />

              <AppInput
                label="Phone number"
                placeholder="07XXXXXXXX"
                value={phoneInput}
                onChangeText={setPhoneInput}
                keyboardType="phone-pad"
                editable={!submitting}
                autoCorrect={false}
                returnKeyType="done"
                hint="Use your Uganda mobile number."
                error={
                  phoneInput.length > 0 && !phoneValid
                    ? "Enter a valid Uganda phone number."
                    : undefined
                }
              />
            </View>

            <View style={helperBoxStyle}>
              <AppText variant="caption" tone="secondary">
                Your contact details will be shared with the employer for this
                application.
              </AppText>
            </View>

            <View style={actionsStyle}>
              <AppButton
                title={submitting ? "Sending..." : "Submit application"}
                onPress={handleSubmit}
                disabled={!canSubmit}
                loading={submitting}
                variant="primary"
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel application"
                disabled={submitting}
                onPress={handleClose}
                style={({ pressed }) => [
                  cancelWrapStyle,
                  pressed && !submitting ? { opacity: 0.72 } : null,
                  submitting ? { opacity: 0.5 } : null,
                ]}
              >
                <AppText variant="labelLg" tone="secondary" weight="700">
                  Cancel
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
