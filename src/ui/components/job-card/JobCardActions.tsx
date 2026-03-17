import React, { useCallback, useMemo, useState } from "react";
import { Alert, View, type ViewStyle } from "react-native";
import * as Linking from "expo-linking";
import type { JobWithCoords } from "../../jobs/jobs.types";
import { normalizeUgPhone } from "@utils/normalizeUgPhone";

import { useTheme } from "../../../theme/useTheme";
import { AppButton } from "../../AppButton";
import { AppText } from "../../AppText";
import { StatusBadge } from "../../StatusBadge";

type Props = {
  job: JobWithCoords;
  applied: boolean;
  onApply: () => void;
};

function parseExpiry(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export default function JobCardActions({ job, applied, onApply }: Props) {
  const { theme } = useTheme();
  const [busy, setBusy] = useState(false);

  const expiryTimestamp = useMemo(
    () => parseExpiry(job.expires_at),
    [job.expires_at],
  );

  const expired = useMemo(() => {
    if (expiryTimestamp === null) return true;
    return expiryTimestamp < Date.now();
  }, [expiryTimestamp]);

  const phoneRaw = useMemo(() => {
    return job.contact_phone ? normalizeUgPhone(job.contact_phone) : null;
  }, [job.contact_phone]);

  const phoneNoPlus = useMemo(() => {
    return phoneRaw ? phoneRaw.replace("+", "") : null;
  }, [phoneRaw]);

  const showCall = job.contact_method === "call" && !expired;
  const showWhatsApp = job.contact_method === "whatsapp" && !expired;
  const showApply = job.contact_method === "in_app" && !expired;

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const rowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const expiredWrapStyle = useMemo<ViewStyle>(
    () => ({
      marginTop: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const appliedWrapStyle = useMemo<ViewStyle>(
    () => ({
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.successSoft,
      borderWidth: 1,
      borderColor: theme.colors.verifiedBorder,
      alignItems: "center",
      justifyContent: "center",
    }),
    [
      theme.colors.successSoft,
      theme.colors.verifiedBorder,
      theme.radius.pill,
      theme.spacing.md,
    ],
  );

  const safeOpen = useCallback(
    async (url: string, unavailableMessage: string) => {
      try {
        const supported = await Linking.canOpenURL(url);

        if (!supported) {
          Alert.alert("Unavailable", unavailableMessage);
          return;
        }

        await Linking.openURL(url);
      } catch {
        Alert.alert("Action failed", "Please try again.");
      }
    },
    [],
  );

  const callEmployer = useCallback(async () => {
    if (!phoneRaw) {
      Alert.alert(
        "Phone number unavailable",
        "This job does not have a callable number.",
      );
      return;
    }

    if (busy) return;
    setBusy(true);

    try {
      await safeOpen(
        `tel:${phoneRaw}`,
        "Calling is not available on this device.",
      );
    } finally {
      setBusy(false);
    }
  }, [busy, phoneRaw, safeOpen]);

  const whatsappEmployer = useCallback(async () => {
    if (!phoneNoPlus) {
      Alert.alert(
        "WhatsApp unavailable",
        "This job does not have a valid WhatsApp number.",
      );
      return;
    }

    if (busy) return;
    setBusy(true);

    const msg = encodeURIComponent(
      `Hello, I saw your "${job.title}" job on AwoJobs and I’m interested.`,
    );

    try {
      await safeOpen(
        `https://wa.me/${phoneNoPlus}?text=${msg}`,
        "WhatsApp is not available on this device.",
      );
    } finally {
      setBusy(false);
    }
  }, [busy, job.title, phoneNoPlus, safeOpen]);

  if (expired) {
    return (
      <View style={expiredWrapStyle}>
        <StatusBadge label="Job expired" tone="error" />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <View style={rowStyle}>
        {showCall ? (
          <AppButton
            title="Call"
            onPress={callEmployer}
            loading={busy}
            disabled={busy}
            variant="secondary"
            size="sm"
            fullWidth={false}
          />
        ) : null}

        {showWhatsApp ? (
          <AppButton
            title="WhatsApp"
            onPress={whatsappEmployer}
            loading={busy}
            disabled={busy}
            variant="primary"
            size="sm"
            fullWidth={false}
          />
        ) : null}

        {showApply && !applied ? (
          <AppButton
            title="Apply"
            onPress={onApply}
            variant="primary"
            size="sm"
            fullWidth={false}
          />
        ) : null}

        {showApply && applied ? (
          <View style={appliedWrapStyle}>
            <AppText variant="label" tone="success" weight="700">
              Applied
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}
