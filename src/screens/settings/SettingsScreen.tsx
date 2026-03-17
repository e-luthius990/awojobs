import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Alert, ActivityIndicator } from "react-native";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";

import { supabase } from "../../core/supabase";
import { useSession } from "../../state/useSession";

import { openWhatsAppSupport } from "../../support/whatsapp";
import { getCachedLocation } from "../../location/location.cache";
import { logout, deleteAccount } from "../../auth/auth.service";
export default function SettingsScreen({ navigation }: any) {
  const { session } = useSession();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<any>(null);

  /* =====================================================
     LOAD SETTINGS (SAFE)
  ====================================================== */
  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!session) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase.rpc("get_settings");

      if (!mounted) return;

      if (error) {
        console.log("Settings RPC error:", error.message);
        setError("Could not load settings.");
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Profile not found.");
        setLoading(false);
        return;
      }

      setSettings(data);
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [session]);

  /* =====================================================
     LOAD LOCATION CACHE
  ====================================================== */
  useEffect(() => {
    getCachedLocation().then(setLocation);
  }, []);

  /* =====================================================
     SAFE RENDER (AFTER ALL HOOKS)
  ====================================================== */

  if (!session) {
    return null;
  }

  if (loading) {
    return (
      <View style={center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !settings) {
    return (
      <View style={center}>
        <Text style={{ opacity: 0.6 }}>
          {error ?? "Unable to load settings."}
        </Text>
      </View>
    );
  }

  const profile = settings.profile;
  const premium = settings.premium;

  /* =====================================================
     ACTIONS
  ====================================================== */

  async function logout() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      Alert.alert("Log out", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert("Logout failed", err.message);
    }
  }

  async function confirmDeleteAccount() {
    Alert.alert(
      "Delete account",
      "This will permanently remove your account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete permanently",
          style: "destructive",
          onPress: async () => {
            await deleteAccount();
          },
        },
      ],
    );
  }

  const version = Constants.expoConfig?.version ?? "1.0.0";
  const appInfoText = `AwoJobs v${version}`;

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FB" }}>
      <View style={{ padding: 20 }}>
        <Text style={header}>Settings</Text>

        {/* ACCOUNT */}
        <Section title="Account">
          <InfoRow label="Your Phone" value={profile.phone} />
          <InfoRow label="Role" value={profile.role} />
        </Section>

        <Spacer size={20} />

        {/* PROFILE */}
        <Section title="Profile">
          <InfoRow label="Name" value={profile.full_name || "Not set"} />
          <InfoRow label="District" value={profile.district || "Not set"} />
        </Section>

        <Spacer size={20} />

        {/* PREMIUM */}
        {profile.role === "job_seeker" && (
          <>
            <Section title="Premium Status">
              {premium?.active ? (
                <Text style={primaryText}>
                  Active • {premium.days_remaining} days remaining
                </Text>
              ) : (
                <Text style={secondaryText}>Not active</Text>
              )}
            </Section>
            <Spacer size={20} />
          </>
        )}

        {/* EMPLOYER */}
        {profile.role === "employer" && (
          <>
            <Section title="Business">
              <InfoRow
                label="Business Name"
                value={profile.business_name || "Not set"}
              />
            </Section>
            <Spacer size={20} />
          </>
        )}

        {/* LOCATION */}
        {location && (
          <>
            <Section title="Location">
              <Text style={primaryText}>{location.district}</Text>
            </Section>
            <Spacer size={20} />
          </>
        )}

        {/* SUPPORT */}
        <Section title="Support">
          <Pressable
            onPress={() => openWhatsAppSupport(profile)}
            style={whatsappBtn}
          >
            <Text style={whatsappText}>Chat with us on WhatsApp</Text>
          </Pressable>
        </Section>

        <Spacer size={30} />

        {/* ACCOUNT ACTIONS */}
        <Section title="Account Actions">
          <Pressable onPress={confirmDeleteAccount}>
            <Text style={{ color: "#B91C1C", fontWeight: "700" }}>
              Delete account
            </Text>
          </Pressable>

          <Spacer size={14} />

          <Pressable onPress={logout}>
            <Text style={{ fontWeight: "700" }}>Log out</Text>
          </Pressable>
        </Section>

        <Spacer size={30} />

        <Text style={metaText}>{appInfoText}</Text>
      </View>
    </View>
  );
}

/* ================= UI HELPERS ================= */

function Section({ title, children }: any) {
  return (
    <View style={section}>
      <Text style={sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: any) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 12, color: "#64748B" }}>{label}</Text>
      <Text style={{ fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

function Spacer({ size = 16 }: any) {
  return <View style={{ height: size }} />;
}

/* ================= STYLES ================= */

const header = {
  fontSize: 20,
  fontWeight: "800",
  marginBottom: 20,
};

const center = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
};

const primaryText = {
  fontWeight: "700",
};

const secondaryText = {
  color: "#64748B",
};

const metaText = {
  fontSize: 12,
  color: "#94A3B8",
};

const section = {
  backgroundColor: "#FFF",
  borderRadius: 14,
  padding: 16,
};

const sectionTitle = {
  fontWeight: "800",
  marginBottom: 12,
};

const whatsappBtn = {
  backgroundColor: "#25D366",
  paddingVertical: 14,
  borderRadius: 12,
  alignItems: "center",
};

const whatsappText = {
  color: "white",
  fontWeight: "800",
};
