import React, { useCallback, useMemo } from "react";
import {
  Alert,
  Linking,
  Pressable,
  Switch,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import type { GuestTabParamList } from "../../navigation/GuestNavigator";
import { useTheme } from "../../theme/useTheme";
import { AppScreen } from "../../ui/AppScreen";
import { AppText } from "../../ui/AppText";

type Props = BottomTabScreenProps<GuestTabParamList, "MyAccount">;

const TERMS_URL = "https://awojobs.com/terms";
const CONTACT_EMAIL = "awojobs@gmail.com";
const WHATSAPP_NUMBER = "+256779799009";

export default function MyAccountGuestScreen({ navigation }: Props) {
  const { theme, isDark, toggleTheme } = useTheme();

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.xl,
      paddingBottom: theme.spacing.xxxl,
    }),
    [theme.spacing.xl, theme.spacing.xxxl],
  );

  const headerStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const roleRowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      gap: theme.spacing.sm,
    }),
    [theme.spacing.sm],
  );

  const sectionStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const subtleSectionStyle = useMemo<ViewStyle>(
    () => ({
      gap: theme.spacing.md,
      opacity: 0.98,
    }),
    [theme.spacing.md],
  );

  const rowGroupStyle = useMemo<ViewStyle>(
    () => ({
      overflow: "hidden",
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurface,
    }),
    [theme.colors.bgSurface, theme.colors.borderDefault, theme.radius.xl],
  );

  const preferenceRowStyle = useMemo<ViewStyle>(
    () => ({
      minHeight: 64,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    }),
    [theme.spacing.md],
  );

  const preferenceTextStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  const dividerStyle = useMemo<ViewStyle>(
    () => ({
      height: 1,
      backgroundColor: theme.colors.borderMuted,
    }),
    [theme.colors.borderMuted],
  );

  const openLogin = useCallback(
    (forcedRole: "employer" | "job_seeker") => {
      const parent = navigation.getParent();
      if (!parent) {
        Alert.alert("Unavailable", "Login is not available right now.");
        return;
      }

      parent.navigate(
        "AuthModal" as never,
        {
          screen: "Login",
          params: { forcedRole },
        } as never,
      );
    },
    [navigation],
  );

  const handleOpenTerms = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(TERMS_URL);
      if (!supported) {
        Alert.alert("Unavailable", "Could not open the terms page.");
        return;
      }
      await Linking.openURL(TERMS_URL);
    } catch {
      Alert.alert("Unavailable", "Could not open the terms page.");
    }
  }, []);

  const handleOpenEmail = useCallback(async () => {
    const url = `mailto:${CONTACT_EMAIL}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Unavailable", "Email is not available on this device.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unavailable", "Could not open email.");
    }
  }, []);

  const handleOpenWhatsApp = useCallback(async () => {
    const digits = WHATSAPP_NUMBER.replace(/\D/g, "");
    const url = `https://wa.me/${digits}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Unavailable", "WhatsApp is not available on this device.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unavailable", "Could not open WhatsApp.");
    }
  }, []);

  return (
    <AppScreen scroll>
      <View style={contentStyle}>
        <View style={headerStyle}>
          <AppText variant="h3">Continue with AwoJobs</AppText>
          <AppText variant="bodySm" tone="secondary">
            Choose your account type to continue.
          </AppText>
        </View>

        <View style={roleRowStyle}>
          <RolePill
            title="Employer"
            selected={false}
            onPress={() => openLogin("employer")}
          />
          <RolePill
            title="Job Seeker"
            selected={false}
            onPress={() => openLogin("job_seeker")}
          />
        </View>

        <View style={sectionStyle}>
          <AppText variant="titleLg">Support</AppText>

          <View style={rowGroupStyle}>
            <SupportRow
              label="WhatsApp"
              meta="Fastest help"
              value={WHATSAPP_NUMBER}
              onPress={handleOpenWhatsApp}
            />
            <View style={dividerStyle} />
            <SupportRow
              label="Email"
              meta="Account support"
              value={CONTACT_EMAIL}
              onPress={handleOpenEmail}
            />
          </View>
        </View>

        <View style={sectionStyle}>
          <AppText variant="titleLg">Legal</AppText>

          <View style={rowGroupStyle}>
            <SupportRow
              label="Terms of Use"
              meta="Read legal terms"
              value="Open terms"
              onPress={handleOpenTerms}
            />
          </View>
        </View>

        <View style={subtleSectionStyle}>
          <AppText variant="titleLg">Preferences</AppText>

          <View style={rowGroupStyle}>
            <View style={preferenceRowStyle}>
              <View style={preferenceTextStyle}>
                <AppText variant="title">Dark mode</AppText>
              </View>

              <Switch
                value={Boolean(isDark)}
                onValueChange={() => {
                  void toggleTheme();
                }}
                trackColor={{
                  false: theme.colors.borderMuted,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.bgSurfaceElevated}
              />
            </View>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

function RolePill({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  const baseStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      minHeight: 48,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: selected ? theme.colors.primary : theme.colors.borderDefault,
      backgroundColor: selected ? theme.colors.primary : theme.colors.bgSurface,
    }),
    [
      selected,
      theme.colors.bgSurface,
      theme.colors.borderDefault,
      theme.colors.primary,
      theme.radius.pill,
      theme.spacing.lg,
    ],
  );

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        baseStyle,
        pressed
          ? {
              backgroundColor: selected
                ? theme.colors.primary
                : theme.colors.bgSurfaceElevated,
            }
          : null,
      ]}
    >
      <AppText
        variant="labelLg"
        weight="700"
        tone={selected ? "inverse" : "default"}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

function SupportRow({
  label,
  meta,
  value,
  onPress,
}: {
  label: string;
  meta?: string;
  value?: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  const rowStyle = useMemo<ViewStyle>(
    () => ({
      minHeight: 68,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md,
      backgroundColor: theme.colors.bgSurface,
    }),
    [theme.colors.bgSurface, theme.spacing.md],
  );

  const textWrapStyle = useMemo<ViewStyle>(
    () => ({
      flex: 1,
      gap: theme.spacing.xs,
    }),
    [theme.spacing.xs],
  );

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        rowStyle,
        pressed ? { backgroundColor: theme.colors.bgSurfaceElevated } : null,
      ]}
    >
      <View style={textWrapStyle}>
        <AppText variant="labelLg" weight="700">
          {label}
        </AppText>

        {meta ? (
          <AppText variant="bodySm" tone="secondary">
            {meta}
          </AppText>
        ) : null}

        {value ? (
          <AppText
            variant="bodySm"
            numberOfLines={1}
            style={{ color: theme.colors.primary }}
          >
            {value}
          </AppText>
        ) : null}
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={theme.colors.textTertiary}
      />
    </Pressable>
  );
}
