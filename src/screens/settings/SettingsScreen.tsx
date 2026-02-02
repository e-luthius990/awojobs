import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  Switch,
  Platform,
  ToastAndroid,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";

import { useProfile } from "../../state/useProfile";
import { signOut, deleteAccount } from "../../auth/auth.service";
import { openWhatsAppSupport } from "../../support/whatsapp";
import { setPushOptIn } from "../../notifications/push.prefs";
import { getCachedLocation } from "../../location/location.cache";
import { ResolvedLocation } from "../../location/location.types";

export default function SettingsScreen({ navigation }: any) {
  const { profile, loading } = useProfile();
  const isAuthenticated = !!profile;

  const [location, setLocation] = useState<ResolvedLocation | null>(null);
  const [notificationsOn, setNotificationsOn] = useState(true);

  useEffect(() => {
    getCachedLocation().then(setLocation);
  }, []);

  if (loading) {
    return (
      <View style={center}>
        <Text style={{ opacity: 0.6 }}>Loading settings…</Text>
      </View>
    );
  }

  /* =====================================================
     ACTIONS
  ====================================================== */
  async function logout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert("Log out?", "You’ll need a code to sign in again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  }

  function confirmDeleteAccount() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert(
      "Delete account",
      "This will permanently remove your account, jobs, and all data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete permanently",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              Alert.alert("Account deleted", "Your account has been removed.");
            } catch (e: any) {
              Alert.alert(
                "Deletion failed",
                e?.message ?? "Could not delete account.",
              );
            }
          },
        },
      ],
    );
  }

  /* =====================================================
     APP INFO (VERSION / BUILD)
  ====================================================== */
  const version =
    Constants.expoConfig?.version ?? Constants.manifest?.version ?? "1.0.0";

  const build =
    Platform.OS === "android"
      ? Constants.expoConfig?.android?.versionCode
      : Constants.expoConfig?.ios?.buildNumber;

  const appInfoText = `AwoJobs v${version}${
    build ? ` (build ${build})` : ""
  } • ${Platform.OS === "android" ? "Android" : "iOS"}`;

  function showCopiedToast() {
    if (Platform.OS === "android") {
      ToastAndroid.show("App info copied", ToastAndroid.SHORT);
    } else {
      Alert.alert("Copied", "App info copied to clipboard.");
    }
  }

  /* =====================================================
     UI
  ====================================================== */
  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FB" }}>
      <View style={{ padding: 20 }}>
        {/* HEADER */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: "#0F172A",
            marginBottom: 20,
          }}
        >
          Settings
        </Text>

        {/* LOCATION */}
        <Section title="Location">
          {location ? (
            <>
              <Text style={primaryText}>
                {location.sub_county}, {location.town}
              </Text>

              <Text style={secondaryText}>{location.district}</Text>

              <Text style={metaText}>
                {location.source === "manual" ? "Set manually" : "Using GPS"}
              </Text>

              <Spacer size={14} />

              <InlineAction
                label="Change location"
                hint="Choose a different area"
                onPress={() => navigation.navigate("ManualLocation")}
              />
            </>
          ) : (
            <InlineAction
              label="Set location"
              hint="Choose your area"
              onPress={() => navigation.navigate("ManualLocation")}
            />
          )}
        </Section>

        <Spacer size={20} />

        {/* NOTIFICATIONS */}
        <Section title="Notifications">
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontWeight: "700", color: "#0F172A" }}>
                Job alerts
              </Text>
              <Text style={secondaryText}>
                Get notified when new jobs appear nearby
              </Text>
            </View>

            <Switch
              value={notificationsOn}
              onValueChange={async (value) => {
                setNotificationsOn(value);

                Haptics.impactAsync(
                  value
                    ? Haptics.ImpactFeedbackStyle.Light
                    : Haptics.ImpactFeedbackStyle.Soft,
                );

                await setPushOptIn(value);
              }}
              trackColor={{ false: "#E5E7EB", true: "#0F172A" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Section>

        <Spacer size={20} />

        {/* SUPPORT */}
        <Section title="Support">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              openWhatsAppSupport(profile);
            }}
            style={{
              backgroundColor: "#25D366",
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "800",
                fontSize: 14,
              }}
            >
              Chat with us on WhatsApp
            </Text>
          </Pressable>
        </Section>

        <Spacer size={20} />

        {/* ABOUT */}
        <Section title="About">
          <Text style={secondaryText}>
            AwoJobs helps you find work opportunities near you. Jobs are posted
            by people and businesses in your area.
          </Text>
        </Section>

        <Spacer size={20} />

        {/* APP INFO */}
        <Section title="App info">
          <Pressable
            onLongPress={async () => {
              await Clipboard.setStringAsync(appInfoText);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              showCopiedToast();
            }}
            delayLongPress={300}
          >
            <Text
              style={{
                fontSize: 12,
                color: "#94A3B8",
                lineHeight: 18,
              }}
            >
              {appInfoText}
            </Text>
          </Pressable>
        </Section>

        {isAuthenticated && (
          <>
            <Spacer size={28} />

            {/* ACCOUNT */}
            <Section title="Account">
              <Pressable onPress={confirmDeleteAccount}>
                <Text
                  style={{
                    color: "#B91C1C",
                    fontWeight: "700",
                  }}
                >
                  Delete account permanently
                </Text>
              </Pressable>
            </Section>

            <Spacer size={20} />

            {/* LOGOUT */}
            <Pressable
              onPress={logout}
              style={{
                paddingVertical: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "#FFFFFF",
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontWeight: "700",
                  color: "#B91C1C",
                }}
              >
                Log out
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

/* =====================================================
   UI HELPERS
===================================================== */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: "800",
          color: "#0F172A",
          marginBottom: 10,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function InlineAction({
  label,
  hint,
  onPress,
}: {
  label: string;
  hint?: string;
  onPress(): void;
}) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 10 }}>
      <Text style={{ fontWeight: "700", color: "#0F172A" }}>{label}</Text>
      {hint && <Text style={secondaryText}>{hint}</Text>}
    </Pressable>
  );
}

function Spacer({ size = 12 }: { size?: number }) {
  return <View style={{ height: size }} />;
}

/* =====================================================
   TEXT STYLES
===================================================== */

const center = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: 24,
};

const primaryText = {
  fontSize: 14,
  fontWeight: "700",
  color: "#0F172A",
};

const secondaryText = {
  fontSize: 13,
  color: "#64748B",
  marginTop: 2,
};

const metaText = {
  fontSize: 12,
  color: "#94A3B8",
  marginTop: 4,
};
