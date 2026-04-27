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
  onViewApplication?: (job: JobWithCoords) => void;
};

type PrimaryAction =
  | "expired"
  | "applied"
  | "call"
  | "whatsapp"
  | "apply"
  | "unavailable";

function parseExpiry(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export default function JobCardActions({
  job,
  applied,
  onApply,
  onViewApplication,
}: Props) {
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

  const primaryAction = useMemo<PrimaryAction>(() => {
    if (expired) return "expired";
    if (applied) return "applied";

    if (job.contact_method === "call") {
      return phoneRaw ? "call" : "unavailable";
    }

    if (job.contact_method === "whatsapp") {
      return phoneNoPlus ? "whatsapp" : "unavailable";
    }

    if (job.contact_method === "in_app") {
      return "apply";
    }

    return "unavailable";
  }, [applied, expired, job.contact_method, phoneNoPlus, phoneRaw]);

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const footerRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const actionWrapStyle = useMemo<ViewStyle>(
    () => ({
      alignSelf: "flex-start",
    }),
    [],
  );

  const safeOpen = useCallback(
    async (url: string, unavailableMessage: string) => {
      try {
        const supported = await Linking.canOpenURL(url);

        if (!supported) {
          Alert.alert("Unavailable", unavailableMessage);
          return false;
        }

        await Linking.openURL(url);
        return true;
      } catch {
        Alert.alert("Action failed", "Please try again.");
        return false;
      }
    },
    [],
  );

  const callEmployer = useCallback(async () => {
    if (!phoneRaw || busy) return;

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
    if (!phoneNoPlus || busy) return;

    setBusy(true);

    const msg = encodeURIComponent(
      `Hello, I saw your "${job.title}" job on AwoJobs and I’m interested.`,
    );

    const appUrl = `whatsapp://send?phone=${phoneNoPlus}&text=${msg}`;
    const webUrl = `https://wa.me/${phoneNoPlus}?text=${msg}`;

    try {
      const canOpenApp = await Linking.canOpenURL(appUrl);

      if (canOpenApp) {
        await Linking.openURL(appUrl);
        return;
      }

      await Linking.openURL(webUrl);
    } catch {
      Alert.alert(
        "WhatsApp unavailable",
        "We could not open WhatsApp on this device.",
      );
    } finally {
      setBusy(false);
    }
  }, [busy, job.title, phoneNoPlus]);

  const handleAppliedPress = useCallback(() => {
    if (onViewApplication) {
      onViewApplication(job);
      return;
    }

    Alert.alert("Already applied", "You have already applied for this job.");
  }, [job, onViewApplication]);

  return (
    <View style={containerStyle}>
      <View style={footerRowStyle}>
        {primaryAction === "expired" ? (
          <StatusBadge label="Expired" tone="error" />
        ) : null}

        <View style={actionWrapStyle}>
          {primaryAction === "call" ? (
            <AppButton
              title="Call now"
              onPress={callEmployer}
              loading={busy}
              disabled={busy}
              variant="secondary"
              size="sm"
              fullWidth={false}
            />
          ) : null}

          {primaryAction === "whatsapp" ? (
            <AppButton
              title="WhatsApp"
              onPress={whatsappEmployer}
              loading={busy}
              disabled={busy}
              variant="whatsapp"
              size="sm"
              fullWidth={false}
            />
          ) : null}

          {primaryAction === "apply" ? (
            <AppButton
              title="Apply now"
              onPress={onApply}
              variant="primary"
              size="sm"
              fullWidth={false}
            />
          ) : null}

          {primaryAction === "applied" ? (
            <AppButton
              title="View application"
              onPress={handleAppliedPress}
              variant="secondary"
              size="sm"
              fullWidth={false}
            />
          ) : null}

          {primaryAction === "expired" ? (
            <AppButton
              title="Expired"
              onPress={() => {}}
              disabled
              variant="secondary"
              size="sm"
              fullWidth={false}
            />
          ) : null}

          {primaryAction === "unavailable" ? (
            <AppButton
              title="Unavailable"
              onPress={() => {}}
              disabled
              variant="secondary"
              size="sm"
              fullWidth={false}
            />
          ) : null}
        </View>
      </View>

      {primaryAction === "unavailable" ? (
        <AppText variant="caption" tone="tertiary">
          Contact method is not available for this job yet.
        </AppText>
      ) : null}
    </View>
  );
}
