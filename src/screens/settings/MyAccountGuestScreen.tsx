import React, { useCallback } from "react";
import { Alert, Linking, Pressable, Switch, View } from "react-native";
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

const FACEBOOK_URL = "https://facebook.com/awojobs";
const TWITTER_URL = "https://twitter.com/awojobs";
const TIKTOK_URL = "https://tiktok.com/@awojobs";

export default function MyAccountGuestScreen({ navigation }: Props) {
  const { theme, isDark, toggleTheme } = useTheme();

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

  const handleOpenLink = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) return Alert.alert("Unavailable", "Cannot open link.");
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unavailable", "Cannot open link.");
    }
  }, []);

  const handleOpenTerms = useCallback(() => {
    handleOpenLink(TERMS_URL);
  }, [handleOpenLink]);

  const handleOpenEmail = useCallback(() => {
    handleOpenLink(`mailto:${CONTACT_EMAIL}`);
  }, [handleOpenLink]);

  const handleOpenWhatsApp = useCallback(() => {
    const digits = WHATSAPP_NUMBER.replace(/\D/g, "");
    handleOpenLink(`https://wa.me/${digits}`);
  }, [handleOpenLink]);

  return (
    <AppScreen scroll>
      <View
        style={{ gap: theme.spacing.xl, paddingBottom: theme.spacing.xxxl }}
      >
        {/* 💎 HERO */}
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="h1">Unlock full access to AwoJobs</AppText>

          <AppText variant="bodySm" tone="secondary">
            You’re browsing as a guest. Upgrade to Premium to unlock all jobs,
            faster applications, and better matches.
          </AppText>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons
              name="lock-closed"
              size={14}
              color={theme.colors.textTertiary}
            />
            <AppText variant="caption" tone="secondary">
              Guest access is limited
            </AppText>
          </View>
        </View>

        {/* 💎 VALUE PROPS */}
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="titleLg">What you unlock</AppText>

          <FeatureItem
            icon="search-outline"
            title="Full job access"
            desc="Browse all national and premium job listings"
          />

          <FeatureItem
            icon="flash-outline"
            title="Faster applications"
            desc="Apply instantly with saved profile details"
          />

          <FeatureItem
            icon="briefcase-outline"
            title="Better matches"
            desc="Get jobs tailored to your location and skills"
          />
        </View>

        {/* 🚀 CTA */}
        <Pressable
          onPress={() => navigation.navigate("Premium" as never)}
          style={{
            height: 56,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            ...theme.shadows.level2,
          }}
        >
          <Ionicons name="sparkles" size={16} color="#fff" />

          <AppText variant="labelLg" tone="inverse">
            Upgrade to Premium
          </AppText>
        </Pressable>

        {/* 👔 EMPLOYER LOGIN */}
        <AppText
          style={{ textAlign: "center", color: theme.colors.textSecondary }}
        >
          Are you an employer?{" "}
          <AppText
            onPress={() => openLogin("employer")}
            style={{ color: theme.colors.primary, fontWeight: "600" }}
          >
            Sign in here
          </AppText>
        </AppText>

        {/* 🧰 SUPPORT */}
        <Section title="Support">
          <SupportRow
            icon="logo-whatsapp"
            label="WhatsApp"
            value={WHATSAPP_NUMBER}
            onPress={handleOpenWhatsApp}
          />

          <Divider />

          <SupportRow
            icon="mail-outline"
            label="Email"
            value={CONTACT_EMAIL}
            onPress={handleOpenEmail}
          />
        </Section>

        {/* 🌐 SOCIALS */}
        <Section title="Follow us">
          <SupportRow
            icon="logo-facebook"
            label="Facebook"
            meta="Daily job updates"
            onPress={() => handleOpenLink(FACEBOOK_URL)}
          />

          <Divider />

          <SupportRow
            icon="logo-twitter"
            label="Twitter / X"
            meta="Announcements & updates"
            onPress={() => handleOpenLink(TWITTER_URL)}
          />

          <Divider />

          <SupportRow
            icon="logo-tiktok"
            label="TikTok"
            meta="Career tips & highlights"
            onPress={() => handleOpenLink(TIKTOK_URL)}
          />
        </Section>

        {/* 📜 LEGAL */}
        <Section title="Legal">
          <SupportRow
            icon="document-text-outline"
            label="Terms of Use"
            onPress={handleOpenTerms}
          />
        </Section>

        {/* ⚙️ PREFERENCES */}
        <Section title="Preferences">
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: theme.spacing.md,
              borderRadius: theme.radius.xl,
              borderWidth: 1,
              borderColor: theme.colors.borderDefault,
              backgroundColor: theme.colors.bgSurface,
            }}
          >
            <AppText variant="title">Dark mode</AppText>

            <Switch
              value={Boolean(isDark)}
              onValueChange={() => toggleTheme()}
              trackColor={{
                false: theme.colors.borderMuted,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.bgSurfaceElevated}
            />
          </View>
        </Section>
      </View>
    </AppScreen>
  );
}

/* ---------------- COMPONENTS ---------------- */

function FeatureItem({
  icon,
  title,
  desc,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radius.xl,
        backgroundColor: theme.colors.bgSurface,
        borderWidth: 1,
        borderColor: theme.colors.borderMuted,
      }}
    >
      <Ionicons name={icon} size={20} color={theme.colors.primary} />

      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="labelLg">{title}</AppText>
        <AppText variant="bodySm" tone="secondary">
          {desc}
        </AppText>
      </View>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.md }}>
      <AppText variant="titleLg">{title}</AppText>

      <View
        style={{
          borderRadius: theme.radius.xl,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: theme.colors.borderDefault,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function SupportRow({
  icon,
  label,
  meta,
  value,
  onPress,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  meta?: string;
  value?: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        padding: theme.spacing.md,
        backgroundColor: pressed
          ? theme.colors.bgSurfaceElevated
          : theme.colors.bgSurface,
        gap: theme.spacing.sm,
      })}
    >
      {icon ? (
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.bgSurfaceElevated,
          }}
        >
          <Ionicons name={icon} size={18} color={theme.colors.primary} />
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        <AppText variant="labelLg">{label}</AppText>

        {meta ? (
          <AppText variant="bodySm" tone="secondary">
            {meta}
          </AppText>
        ) : null}

        {value ? (
          <AppText variant="caption" style={{ color: theme.colors.primary }}>
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

function Divider() {
  const { theme } = useTheme();
  return (
    <View
      style={{
        height: 1,
        backgroundColor: theme.colors.borderMuted,
      }}
    />
  );
}
