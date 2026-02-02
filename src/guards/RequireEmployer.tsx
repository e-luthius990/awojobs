import React, { useEffect, useRef } from "react";
import { View, ActivityIndicator, Text, Pressable } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSession } from "../state/useSession";
import { useProfile } from "../state/useProfile";

export function RequireEmployer({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation<any>();
  const route = useRoute();

  const { session, loading: sessionLoading } = useSession();
  const { profile, loading: profileLoading } = useProfile();

  const redirectedRef = useRef(false);

  // ✅ DEV BYPASS
  if (__DEV__) {
    return <>{children}</>;
  }

  useEffect(() => {
    if (sessionLoading) return;

    if (!session) {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        navigation.navigate("Auth");
      }
      return;
    }

    redirectedRef.current = false;
  }, [session, sessionLoading, navigation, route.key]);

  if (sessionLoading || (session && profileLoading)) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) return null;

  if (!profile) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
          Employer access only
        </Text>

        <Text style={{ opacity: 0.75, marginBottom: 14 }}>
          Posting jobs is for employers. You can still browse jobs freely.
        </Text>

        <Pressable
          onPress={() => navigation.navigate("FeedTab")}
          style={{
            backgroundColor: "#111",
            padding: 14,
            borderRadius: 12,
          }}
        >
          <Text
            style={{ color: "white", textAlign: "center", fontWeight: "600" }}
          >
            Back to Jobs
          </Text>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}
