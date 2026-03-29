import React, { useCallback, useMemo, useRef } from "react";
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

import { useTheme } from "../../../theme/useTheme";
import { AppText } from "../../AppText";
import { AppButton } from "../../AppButton";

type Props = {
  visible: boolean;
  onClose: () => void;
  submitting: boolean;
  onSubmit: () => Promise<void>;
};

export default function JobCardApplyModal({
  visible,
  onClose,
  submitting,
  onSubmit,
}: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const submitLockedRef = useRef(false);

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

  const infoBoxStyle = useMemo<ViewStyle>(
    () => ({
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.bgSurfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      gap: theme.spacing.xs,
    }),
    [
      theme.colors.bgSurfaceMuted,
      theme.colors.borderMuted,
      theme.radius.lg,
      theme.spacing.md,
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

  const handleSubmit = useCallback(async () => {
    if (submitting || submitLockedRef.current) return;

    submitLockedRef.current = true;
    try {
      await onSubmit();
    } finally {
      submitLockedRef.current = false;
    }
  }, [onSubmit, submitting]);

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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close application form"
            style={backdropTapAreaStyle}
            onPress={handleClose}
          />

          <View style={sheetStyle}>
            <View style={handleWrapStyle}>
              <View style={handleStyle} />
            </View>

            <View style={headerRowStyle}>
              <View style={headerStyle}>
                <AppText variant="h3">Apply for this job</AppText>
                <AppText variant="bodySm" tone="secondary">
                  Your profile name and phone number will be shared with the
                  employer.
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

            <View style={infoBoxStyle}>
              <AppText variant="bodySm">
                When you submit, AwoJobs sends your saved profile details to the
                employer.
              </AppText>
              <AppText variant="caption" tone="secondary">
                Update your profile first if your name or phone number is
                outdated.
              </AppText>
            </View>

            <View style={actionsStyle}>
              <AppButton
                title={submitting ? "Sending..." : "Submit application"}
                onPress={() => {
                  void handleSubmit();
                }}
                disabled={submitting}
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
